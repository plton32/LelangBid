# STEP 10 - COA Certificate Module

## Tujuan
Membuat sertifikat keaslian jersey dengan QR Code.

## Data Certificate
- jersey_id
- coa_number
- qr_code_url
- verifier_name
- verification_notes
- status

## Status COA
```txt
valid
revoked
pending
```

## Fitur
- Admin/verificator membuat COA
- Sistem generate nomor COA unik
- Sistem generate QR Code
- QR Code membuka halaman public verification

## Halaman Public Verification
```txt
/verify/:coa_number
```

Menampilkan:
- Nomor COA
- Foto jersey
- Detail jersey
- Nama pemain
- Klub
- Status keaslian
- Tanggal verifikasi

## Prompt Coding
Buatkan modul Certificate of Authenticity untuk website lelang jersey. Admin/verificator dapat membuat COA untuk jersey verified, generate nomor COA unik, generate QR Code, dan membuat halaman public verification berdasarkan coa_number.

## Acceptance Criteria
- COA bisa dibuat
- QR Code bisa discan
- Halaman verify menampilkan detail jersey
- Status valid/revoked bisa diubah
