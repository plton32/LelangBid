# STEP 06 - Modul Jersey Product

## Tujuan
Admin/Seller dapat menambahkan jersey yang akan dilelang.

## Data Jersey
- title
- player_name
- club_name
- league_name
- season
- size
- condition
- jersey_type
- is_signed
- has_coa
- description
- images
- status

## Status Jersey
```txt
draft
pending_verification
verified
rejected
archived
```

## Endpoint
```txt
GET    /api/jerseys
GET    /api/jerseys/:id
POST   /api/jerseys
PATCH  /api/jerseys/:id
DELETE /api/jerseys/:id
POST   /api/jerseys/:id/images
PATCH  /api/admin/jerseys/:id/verify
```

## Frontend Pages
```txt
/admin/jerseys
/admin/jerseys/create
/admin/jerseys/:id/edit
/seller/jerseys
/seller/jerseys/create
```

## Prompt Coding
Buatkan modul Jersey Product untuk website lelang jersey. Admin dan seller dapat tambah/edit/hapus jersey, upload banyak foto, mengatur status draft/pending/verified/rejected, dan menampilkan data jersey di dashboard admin. Gunakan Supabase Storage untuk upload gambar.

## Acceptance Criteria
- Jersey dapat dibuat
- Foto jersey dapat diupload
- Jersey dapat diverifikasi admin
- Jersey verified bisa dibuat auction
