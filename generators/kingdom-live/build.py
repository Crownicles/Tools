"""
Builds the Grafana dashboard « Le royaume en direct »: every hero of the kingdom on the real map of the game,
the roads they took during the selected period, and the crowd waiting in each place.

    python3 build.py                 writes dashboard.json next to this file
    python3 build.py --deploy        also pushes it to Grafana (GRAFANA_URL and GRAFANA_TOKEN in the environment)
    python3 build.py --tiles DIR     cuts the map into XYZ tiles in DIR/{z}/{x}/{y}.webp

The map is drawn as a fake Web Mercator world whose zoom 5 is the 8192 px map itself, so a map pixel converts
exactly to a latitude and a longitude. Places, road midpoints and trip durations are read from the map builder,
the game resources and the French translations, then inlined in the SQL: the logs database only knows ids.
"""
import argparse
import glob
import json
import math
import os
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.normpath(os.path.join(HERE, "..", ".."))
GAME = os.environ.get("CROWNICLES_REPO", os.path.normpath(os.path.join(TOOLS, "..", "Crownicles")))

MAP_COORDS = os.path.join(TOOLS, "generators", "map-builder", "mapCoords", "main_continent.json")
MAP_IMAGE = os.path.join(TOOLS, "generators", "Ressources", "map_fr.jpg")
TILES_URL = "https://crownicles.com/public/ressources/kingdom/tiles/{z}/{x}/{y}.webp"

DASHBOARD_UID = "royaume-en-direct"
FOLDER_UID = "joueurs-folder"
LOGS_DATASOURCE = {"type": "mysql", "uid": "kKJCQf44z"}

TILE_SIZE = 256
NATIVE_ZOOM = 5
WORLD = TILE_SIZE * 2 ** NATIVE_ZOOM
# The marker of the cursor maps is pasted by its top-left corner: its tip is what points at the place.
MARKER_TIP = (140, 484)
# Height, in map pixels, over which the bottom of the continent melts into the sea.
BOTTOM_FADE = 260
# Heroes whose last departure is older than this are considered asleep and leave the map.
ACTIVE_WINDOW = 24 * 3600
# The reception room sends new heroes straight to their first destination, without a road on the map.
RECEPTION_ROOM = 29
CASTLE_IDS = {28, 29, 32, 41}

# Centred on the road network rather than fitted to the data: a fitted view would jump back at every refresh.
VIEW_CENTER = (4300, 2570)
VIEW_ZOOM = 2.85
# No minZoom: Grafana 13.0.2 applies it as the maximum zoom, which locks the view out of zooming back in.
# noRepeat already stops the zoom out where the map fills the panel. One level past the tiles stays sharp.
MAX_ZOOM = NATIVE_ZOOM + 1

HERO_COLOR = "#E5322D"
PLACE_COLOR = "#FFF4D6"

# The Mercator world is square and Grafana keeps the view inside it: below the continent lies the open sea,
# so zooming out or panning down never shows an empty area.
SEA_TOP = (86, 102, 106)
SEA_BOTTOM = (40, 50, 54)


def load_map():
	coords = json.load(open(MAP_COORDS, encoding="utf-8"))
	names = json.load(open(os.path.join(GAME, "Lang", "fr", "models.json"), encoding="utf-8"))["map_locations"]
	places = {
		int(i): (p["x"] + MARKER_TIP[0], p["y"] + MARKER_TIP[1], names[i]["name"])
		for i, p in coords["nodes"].items()
	}
	midpoints = {
		tuple(sorted((e["startMap"], e["endMap"]))): (e["x"] + MARKER_TIP[0], e["y"] + MARKER_TIP[1])
		for e in coords["edges"].values()
	}
	durations = {}
	for path in glob.glob(os.path.join(GAME, "Core", "resources", "mapLinks", "*.json")):
		link = json.load(open(path, encoding="utf-8"))
		durations[(link["startMap"], link["endMap"])] = link["tripDuration"]
	roads = sorted({
		tuple(sorted(pair)) for pair in durations
		if pair[0] in places and pair[1] in places
		and not (RECEPTION_ROOM in pair and not set(pair) <= CASTLE_IDS)
		and not set(pair) <= CASTLE_IDS
	})
	return places, midpoints, durations, roads


def sql_text(value):
	return "'" + value.replace("'", "''") + "'"


def lat_sql(y):
	return f"DEGREES(2 * ATAN(EXP(PI() * (1 - 2 * ({y}) / {WORLD}))) - PI() / 2)"


def lon_sql(x):
	return f"(({x}) / {WORLD} * 360 - 180)"


def lat(y):
	return math.degrees(2 * math.atan(math.exp(math.pi * (1 - 2 * y / WORLD))) - math.pi / 2)


def lon(x):
	return x / WORLD * 360 - 180


def ctes(places, midpoints, durations, roads):
	place_rows = ",\n\t\t".join(f"({i}, {x}, {y}, {sql_text(n)})" for i, (x, y, n) in sorted(places.items()))
	mid_rows = ",\n\t\t".join(f"({a}, {b}, {x}, {y})" for (a, b), (x, y) in sorted(midpoints.items()) if (a, b) in roads)
	trip_rows = ",\n\t\t".join(
		f"({s}, {e}, {m})" for (s, e), m in sorted(durations.items()) if tuple(sorted((s, e))) in roads
	)
	return f"""places(id, x, y, name) AS (VALUES
		{place_rows}
	),
	mids(a, b, x, y) AS (VALUES
		{mid_rows}
	),
	trips(s, e, minutes) AS (VALUES
		{trip_rows}
	)"""


def last_departures(where_extra=""):
	return f"""last_departures AS (
		SELECT playerId, mapLinkId, date FROM (
			SELECT playerId, mapLinkId, date, ROW_NUMBER() OVER (PARTITION BY playerId ORDER BY date DESC) AS n
			FROM players_travels
			WHERE date > $__unixEpochTo() - {ACTIVE_WINDOW} AND date <= $__unixEpochTo(){where_extra}
		) ranked WHERE n = 1
	)"""


def query_nodes(places, midpoints, roads):
	rows = [f"SELECT 'L{i}' AS id, {lat(y):.6f} AS latitude, {lon(x):.6f} AS longitude" for i, (x, y, _) in sorted(places.items())]
	rows += [
		f"SELECT 'M{a}_{b}' AS id, {lat(y):.6f} AS latitude, {lon(x):.6f} AS longitude"
		for (a, b), (x, y) in sorted(midpoints.items()) if (a, b) in roads
	]
	return "\nUNION ALL ".join(rows)


def query_edges(base):
	return f"""WITH {base},
	traffic AS (
		SELECT LEAST(l.start, l.end) AS a, GREATEST(l.start, l.end) AS b, COUNT(*) AS travels
		FROM players_travels t JOIN map_links l ON l.id = t.mapLinkId
		WHERE t.date BETWEEN $__unixEpochFrom() AND $__unixEpochTo()
		GROUP BY 1, 2
	),
	roads AS (
		SELECT DISTINCT LEAST(s, e) AS a, GREATEST(s, e) AS b FROM trips
	)
SELECT CONCAT('E', r.a, '_', r.b, '_1') AS id, CONCAT('L', r.a) AS source,
	IF(m.a IS NULL, CONCAT('L', r.b), CONCAT('M', r.a, '_', r.b)) AS target, t.travels
FROM roads r JOIN traffic t ON t.a = r.a AND t.b = r.b LEFT JOIN mids m ON m.a = r.a AND m.b = r.b
UNION ALL
SELECT CONCAT('E', r.a, '_', r.b, '_2'), CONCAT('M', r.a, '_', r.b), CONCAT('L', r.b), t.travels
FROM roads r JOIN traffic t ON t.a = r.a AND t.b = r.b JOIN mids m ON m.a = r.a AND m.b = r.b"""


def query_heroes(base):
	position = """CASE
			WHEN m.a IS NULL THEN {a} + ({b} - {a}) * j.progress
			WHEN j.progress < 0.5 THEN {a} + ({m} - {a}) * 2 * j.progress
			ELSE {m} + ({b} - {m}) * (2 * j.progress - 1)
		END"""
	px = position.format(a="p1.x", b="p2.x", m="m.x")
	py = position.format(a="p1.y", b="p2.y", m="m.y")
	return f"""WITH {base},
	{last_departures()},
	journeys AS (
		SELECT d.playerId, l.start, l.end, d.date, t.minutes,
			LEAST(1, ($__unixEpochTo() - d.date) / (t.minutes * 60)) AS progress
		FROM last_departures d
		JOIN map_links l ON l.id = d.mapLinkId
		JOIN trips t ON t.s = l.start AND t.e = l.end
	),
	positions AS (
		SELECT j.*, p1.name AS from_name, p2.name AS to_name, {px} AS px, {py} AS py
		FROM journeys j
		JOIN places p1 ON p1.id = j.start
		JOIN places p2 ON p2.id = j.end
		LEFT JOIN mids m ON m.a = LEAST(j.start, j.end) AND m.b = GREATEST(j.start, j.end)
		WHERE j.progress < 1
	)
SELECT CONCAT('Héros n°', playerId) AS "Héros", from_name AS "Parti de", to_name AS "En route vers",
	ROUND(100 * progress) AS "Progression",
	FROM_UNIXTIME(date + minutes * 60) AS "Arrivée prévue",
	{lat_sql('py')} AS latitude, {lon_sql('px')} AS longitude
FROM positions ORDER BY progress DESC"""


def query_places(base):
	return f"""WITH {base},
	{last_departures()},
	arrived AS (
		SELECT l.end AS place, COUNT(*) AS heroes
		FROM last_departures d
		JOIN map_links l ON l.id = d.mapLinkId
		JOIN trips t ON t.s = l.start AND t.e = l.end
		WHERE d.date + t.minutes * 60 <= $__unixEpochTo()
		GROUP BY l.end
	)
SELECT p.name AS "Lieu", a.heroes AS "Héros présents", {lat_sql('p.y')} AS latitude, {lon_sql('p.x')} AS longitude
FROM arrived a JOIN places p ON p.id = a.place ORDER BY a.heroes DESC"""


def query_counts(base):
	"""One row: the heroes of the main continent active in the last 24 h, walking or resting."""
	return f"""WITH {base},
	{last_departures()},
	journeys AS (
		SELECT d.date, t.minutes
		FROM last_departures d JOIN map_links l ON l.id = d.mapLinkId
		JOIN trips t ON t.s = l.start AND t.e = l.end
	)
SELECT
	SUM(date + minutes * 60 > $__unixEpochTo()) AS "En route",
	SUM(date + minutes * 60 <= $__unixEpochTo()) AS "Au repos"
FROM journeys"""


def query_activity():
	return """SELECT $__unixEpochGroupAlias(date, $__interval), COUNT(*) AS "Départs"
FROM players_travels WHERE $__unixEpochFilter(date)
GROUP BY 1 ORDER BY 1"""


def query_period():
	return """SELECT COUNT(*) AS "Départs", COUNT(DISTINCT playerId) AS "Aventuriers"
FROM players_travels WHERE $__unixEpochFilter(date)"""


def query_top_roads(base):
	return f"""WITH {base}
SELECT CONCAT(p1.name, ' ↔ ', p2.name) AS "Route", COUNT(*) AS "Passages"
FROM players_travels t JOIN map_links l ON l.id = t.mapLinkId
JOIN places p1 ON p1.id = LEAST(l.start, l.end) JOIN places p2 ON p2.id = GREATEST(l.start, l.end)
WHERE $__unixEpochFilter(t.date) AND l.start <> l.end
GROUP BY p1.name, p2.name ORDER BY 2 DESC LIMIT 12"""


def target(ref, sql, fmt="table"):
	return {"refId": ref, "datasource": LOGS_DATASOURCE, "editorMode": "code", "format": fmt, "rawQuery": True, "rawSql": sql}


def stat(panel_id, title, ref, sql, grid, color, description):
	return {
		"id": panel_id, "type": "stat", "title": title, "description": description, "gridPos": grid,
		"datasource": LOGS_DATASOURCE, "targets": [target(ref, sql)],
		"fieldConfig": {"defaults": {"color": {"mode": "fixed", "fixedColor": color}, "unit": "none", "decimals": 0}, "overrides": []},
		"options": {
			"reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False},
			"colorMode": "value", "graphMode": "none", "textMode": "value", "justifyMode": "center",
			"orientation": "horizontal", "wideLayout": True, "showPercentChange": False
		}
	}


def hidden_in_tooltip(*names):
	return [
		{"matcher": {"id": "byName", "options": n}, "properties": [{"id": "custom.hideFrom", "value": {"tooltip": True, "viz": False, "legend": True}}]}
		for n in names
	]


def map_panel(places, midpoints, roads, base):
	return {
		"id": 1, "type": "geomap", "title": "Le royaume",
		"description": "Chaque point rouge est un héros en route, à l'instant de la fin de la période choisie. Les bulles comptent les héros arrivés dans chaque lieu, et les routes s'épaississent avec les passages de la période. Pour remonter le temps, sélectionnez un moment sur le graphique des départs ou décalez la période avec les flèches du sélecteur de temps.",
		"gridPos": {"h": 30, "w": 24, "x": 0, "y": 4},
		"datasource": LOGS_DATASOURCE,
		"targets": [
			target("nodes", query_nodes(places, midpoints, roads)),
			target("edges", query_edges(base)),
			target("places", query_places(base)),
			target("heroes", query_heroes(base)),
		],
		"fieldConfig": {
			"defaults": {"color": {"mode": "continuous-YlRd"}, "custom": {"hideFrom": {"legend": False, "tooltip": False, "viz": False}}},
			"overrides": hidden_in_tooltip("latitude", "longitude", "id", "source", "target") + [
				{"matcher": {"id": "byName", "options": "Progression"}, "properties": [{"id": "unit", "value": "percent"}]},
				{"matcher": {"id": "byName", "options": "travels"}, "properties": [{"id": "displayName", "value": "Passages"}]},
			]
		},
		"options": {
			"view": {"id": "coords", "lat": round(lat(VIEW_CENTER[1]), 4), "lon": round(lon(VIEW_CENTER[0]), 4), "zoom": VIEW_ZOOM, "maxZoom": MAX_ZOOM, "allLayers": True, "noRepeat": True},
			"controls": {"showZoom": True, "mouseWheelZoom": True, "showAttribution": False, "showScale": False, "showMeasure": False, "showDebug": False},
			"tooltip": {"mode": "details"},
			"basemap": {
				"type": "xyz", "name": "Carte du royaume", "noRepeat": True,
				"config": {"url": TILES_URL, "attribution": "Crownicles", "minZoom": 0, "maxZoom": NATIVE_ZOOM}
			},
			"layers": [
				{
					"type": "network", "name": "Routes", "tooltip": True, "opacity": 0.85,
					"location": {"mode": "coords", "latitude": "latitude", "longitude": "longitude"},
					"config": {
						"arrow": 0, "showLegend": False,
						"style": {"color": {"fixed": "transparent"}, "opacity": 0, "size": {"fixed": 1, "min": 1, "max": 1}, "symbol": {"mode": "fixed", "fixed": "img/icons/marker/circle.svg"}, "rotation": {"fixed": 0, "mode": "mod", "min": -360, "max": 360}},
						"edgeStyle": {"color": {"field": "travels", "fixed": "#F2B33D"}, "opacity": 0.85, "size": {"field": "travels", "fixed": 3, "min": 2, "max": 12}, "rotation": {"fixed": 0, "mode": "mod", "min": -360, "max": 360}}
					}
				},
				{
					"type": "markers", "name": "Lieux", "tooltip": True,
					"filterData": {"id": "byRefId", "options": "places"},
					"location": {"mode": "coords", "latitude": "latitude", "longitude": "longitude"},
					"config": {
						"showLegend": False,
						"style": {
							"color": {"fixed": PLACE_COLOR}, "opacity": 0.4, "lineWidth": 2,
							"size": {"field": "Héros présents", "fixed": 10, "min": 8, "max": 26},
							"symbol": {"mode": "fixed", "fixed": "img/icons/marker/circle.svg"}, "symbolAlign": {"horizontal": "center", "vertical": "center"},
							"rotation": {"fixed": 0, "mode": "mod", "min": -360, "max": 360},
							"text": {"mode": "field", "field": "Héros présents", "fixed": ""},
							"textConfig": {"fontSize": 15, "font": "bold 15px Inter, Helvetica, Arial, sans-serif", "offsetX": 0, "offsetY": -30, "textAlign": "center", "textBaseline": "middle"}
						}
					}
				},
				{
					"type": "markers", "name": "Héros en route", "tooltip": True,
					"filterData": {"id": "byRefId", "options": "heroes"},
					"location": {"mode": "coords", "latitude": "latitude", "longitude": "longitude"},
					"config": {
						"showLegend": False,
						"style": {
							"color": {"fixed": HERO_COLOR}, "opacity": 0.95, "size": {"fixed": 7, "min": 2, "max": 15},
							"symbol": {"mode": "fixed", "fixed": "img/icons/marker/circle.svg"}, "symbolAlign": {"horizontal": "center", "vertical": "center"},
							"rotation": {"fixed": 0, "mode": "mod", "min": -360, "max": 360},
							"textConfig": {"fontSize": 12, "offsetX": 0, "offsetY": 0, "textAlign": "center", "textBaseline": "middle"}
						}
					}
				}
			]
		}
	}


def build():
	places, midpoints, durations, roads = load_map()
	base = ctes(places, midpoints, durations, roads)
	counts = query_counts(base)
	descriptions = {
		"En route": "Héros actifs ces dernières 24 h qui marchent vers leur prochain lieu, à la fin de la période choisie.",
		"Au repos": "Héros actifs ces dernières 24 h arrivés à destination, qui attendent leur prochain départ."
	}
	panels = [
		stat(10 + i, title, "counts", counts, {"h": 4, "w": 6, "x": 6 * i, "y": 0}, color, descriptions[title])
		for i, (title, color) in enumerate([("En route", HERO_COLOR), ("Au repos", "#D8C9A3")])
	]
	for panel in panels:
		panel["options"]["reduceOptions"]["fields"] = f"/^{panel['title']}$/"
	period = stat(14, "Sur la période", "period", query_period(), {"h": 4, "w": 12, "x": 12, "y": 0}, "#F2B33D", "Départs enregistrés et aventuriers différents entre le début et la fin de la période choisie.")
	period["options"]["textMode"] = "value_and_name"
	period["options"]["reduceOptions"]["fields"] = ""
	panels.append(period)
	panels.append(map_panel(places, midpoints, roads, base))
	panels.append({
		"id": 20, "type": "timeseries", "title": "Départs",
		"description": "Sélectionnez un moment à la souris pour y emmener la carte.",
		"gridPos": {"h": 8, "w": 16, "x": 0, "y": 34}, "datasource": LOGS_DATASOURCE, "interval": "5m", "maxDataPoints": 90,
		"targets": [target("activity", query_activity(), "time_series")],
		"fieldConfig": {"defaults": {"color": {"mode": "fixed", "fixedColor": "#F2B33D"}, "custom": {"drawStyle": "bars", "fillOpacity": 70, "lineWidth": 0, "barAlignment": 0, "showPoints": "never"}}, "overrides": []},
		"options": {"legend": {"showLegend": False, "displayMode": "list", "placement": "bottom", "calcs": []}, "tooltip": {"mode": "single", "sort": "none"}}
	})
	panels.append({
		"id": 21, "type": "table", "title": "Routes les plus empruntées",
		"gridPos": {"h": 8, "w": 8, "x": 16, "y": 34}, "datasource": LOGS_DATASOURCE,
		"targets": [target("roads", query_top_roads(base))],
		"fieldConfig": {"defaults": {"custom": {"align": "auto", "cellOptions": {"type": "auto"}}}, "overrides": [
			{"matcher": {"id": "byName", "options": "Passages"}, "properties": [{"id": "custom.cellOptions", "value": {"type": "gauge", "mode": "basic", "valueDisplayMode": "text"}}, {"id": "color", "value": {"mode": "continuous-YlRd"}}, {"id": "custom.width", "value": 150}]}
		]},
		"options": {"showHeader": True, "cellHeight": "sm", "footer": {"show": False}}
	})
	return {
		"uid": DASHBOARD_UID, "title": "🗺️ Le royaume en direct", "tags": ["crownicles", "carte", "joueurs"],
		"timezone": "browser", "editable": True, "graphTooltip": 0, "schemaVersion": 41,
		"time": {"from": "now-6h", "to": "now"}, "refresh": "30s",
		"timepicker": {"refresh_intervals": ["10s", "30s", "1m", "5m"]},
		"panels": panels, "templating": {"list": []}, "annotations": {"list": []}
	}


def sea(size):
	from PIL import Image
	gradient = Image.new("RGB", (1, size))
	for y in range(size):
		k = max(0.0, (y - 5000) / (size - 5000))
		gradient.putpixel((0, y), tuple(round(a + (b - a) * k) for a, b in zip(SEA_TOP, SEA_BOTTOM)))
	return gradient.resize((size, size))


def compose_world():
	from PIL import Image, ImageDraw
	Image.MAX_IMAGE_PIXELS = None
	continent = Image.open(MAP_IMAGE).convert("RGB")
	width, height = continent.size
	assert width == WORLD, f"the map must be {WORLD} px wide to be zoom {NATIVE_ZOOM}"
	world = sea(WORLD)
	fade = Image.new("L", continent.size, 255)
	draw = ImageDraw.Draw(fade)
	for row in range(BOTTOM_FADE):
		draw.line([(0, height - 1 - row), (width, height - 1 - row)], fill=round(255 * (row / BOTTOM_FADE) ** 0.8))
	world.paste(continent, (0, 0), fade)
	return world


def cut_tiles(directory):
	from PIL import Image
	world = compose_world()
	for zoom in range(NATIVE_ZOOM + 1):
		size = TILE_SIZE * 2 ** zoom
		image = world if size == WORLD else world.resize((size, size), Image.LANCZOS)
		for x in range(size // TILE_SIZE):
			for y in range(size // TILE_SIZE):
				os.makedirs(os.path.join(directory, str(zoom), str(x)), exist_ok=True)
				tile = image.crop((x * TILE_SIZE, y * TILE_SIZE, (x + 1) * TILE_SIZE, (y + 1) * TILE_SIZE))
				tile.save(os.path.join(directory, str(zoom), str(x), f"{y}.webp"), "WEBP", quality=78, method=6)


def deploy(dashboard):
	request = urllib.request.Request(
		os.environ["GRAFANA_URL"].rstrip("/") + "/api/dashboards/db",
		data=json.dumps({"dashboard": dashboard, "folderUid": FOLDER_UID, "overwrite": True, "message": "build.py"}).encode(),
		headers={"Authorization": "Bearer " + os.environ["GRAFANA_TOKEN"], "Content-Type": "application/json"},
		method="POST"
	)
	with urllib.request.urlopen(request) as response:
		return json.load(response)


if __name__ == "__main__":
	parser = argparse.ArgumentParser()
	parser.add_argument("--deploy", action="store_true")
	parser.add_argument("--tiles")
	parser.add_argument("--tiles-url", default=TILES_URL, help="tile URL template, to try local tiles before publishing them")
	args = parser.parse_args()
	if args.tiles:
		cut_tiles(args.tiles)
	TILES_URL = args.tiles_url
	result = build()
	json.dump(result, open(os.path.join(HERE, "dashboard.json"), "w", encoding="utf-8"), ensure_ascii=False, indent="\t")
	if args.deploy:
		print(deploy(result))
