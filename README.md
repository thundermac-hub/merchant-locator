# Merchant Locator (Next.js + MySQL)

Simple Next.js web app that captures data from a MySQL table (`franchise_cache`) and renders outlets on Mapbox.

## 1. Install

```bash
npm install
```

## 2. Configure database

Copy `.env.example` to `.env` and fill in your database credentials:

```bash
cp .env.example .env
```

Required variables:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `NEXT_PUBLIC_MAPBOX_TOKEN` (Mapbox public token)

## 3. Run app

```bash
npm run dev
```

Open:

- UI: http://localhost:3000
- API: http://localhost:3000/api/franchises

## Map style

The map uses Mapbox GL JS with:

- Style: `mapbox://styles/mapbox/streets-v12`

## Query used

The app reads active franchises with at least one outlet:

```sql
SELECT
  fid,
  franchise_name,
  franchise_json,
  outlets_json,
  outlet_count,
  import_index
FROM franchise_cache
WHERE is_active = 1
  AND outlet_count >= 1
ORDER BY import_index ASC, franchise_name ASC;
```
