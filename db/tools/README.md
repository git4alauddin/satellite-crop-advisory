# Region Boundary Import

Use this to import real district/state boundaries from a GeoJSON `FeatureCollection` into `regions`.

## 1) Apply DB support migration

```powershell
Get-Content db/init/009_regions_import_support.sql -Raw | docker exec -i sca_postgis psql -U sca_user -d sca_geo
```

## 2) Run importer

From repository root:

```powershell
python db/tools/import_regions_geojson.py --file path/to/boundaries.geojson --source official_boundaries --name-prop name --code-prop code
```

If your JSON property keys differ, change `--name-prop` / `--code-prop`.

## 3) Optional full source replace

```powershell
python db/tools/import_regions_geojson.py --file path/to/boundaries.geojson --source official_boundaries --replace-source
```

## 4) Verify

```powershell
docker exec -i sca_postgis psql -U sca_user -d sca_geo -c "SELECT id, name, region_code, source FROM regions ORDER BY id LIMIT 20;"
```

## One-command official demo region (recommended)

Sets `region_id=1` to official geoBoundaries district geometry (default: `Ludhiana`, `IND`, `ADM2`):

```powershell
python db/tools/set_official_demo_region.py
```

Custom district:

```powershell
python db/tools/set_official_demo_region.py --district Hisar
```
