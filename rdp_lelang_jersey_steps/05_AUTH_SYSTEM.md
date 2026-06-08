# STEP 05 - Authentication System

## Tujuan
Membuat login, register, session, dan proteksi role.

## Fitur
- Register member
- Login email/password
- JWT token
- Get profile `/api/auth/me`
- Middleware protect route
- Role guard admin/seller/member

## Role
```txt
member
seller
verificator
admin
superadmin
```

## Request Register
```json
{
  "full_name": "Budi Santoso",
  "email": "budi@email.com",
  "phone": "08123456789",
  "password": "password123"
}
```

## Request Login
```json
{
  "email": "budi@email.com",
  "password": "password123"
}
```

## Response Login
```json
{
  "success": true,
  "token": "JWT_TOKEN",
  "user": {
    "id": "uuid",
    "full_name": "Budi Santoso",
    "email": "budi@email.com",
    "role": "member"
  }
}
```

## Prompt Coding
Buatkan sistem authentication untuk website lelang jersey menggunakan Node Express, Supabase PostgreSQL, bcryptjs, dan JWT. Buat endpoint register, login, me, middleware auth, dan middleware role guard. Simpan token di frontend localStorage dan buat AuthContext React.

## Acceptance Criteria
- User bisa register
- User bisa login
- Password terenkripsi
- Token JWT valid
- Halaman dashboard hanya bisa diakses setelah login
