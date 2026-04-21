# Project Init + T-01 Auth & RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold monorepo (Laravel 11 backend + Next.js 14 frontend), init git, implement T-01 — full auth (login/logout/me) + RBAC (16 roles) + user & depot CRUD, end-to-end from login page to protected dashboard.

**Architecture:** Monorepo `simhq/` root with `backend/` (Laravel 11 + Sanctum token auth) and `frontend/` (Next.js 14 App Router + NextAuth v5 credentials). Frontend stores Sanctum token in encrypted NextAuth session, forwards as `Authorization: Bearer` header to all API calls. Depot isolation enforced at model query scope level.

**Tech Stack:** Laravel 11, Laravel Sanctum, PostgreSQL 16, Next.js 14 (App Router), NextAuth v5 (next-auth@beta), Tailwind CSS, TypeScript, PHPUnit (backend tests), Vitest + Testing Library (frontend tests)

---

## File Map

### Backend — Created
```
backend/
  app/Enums/UserRole.php
  app/Models/Depot.php
  app/Models/User.php
  app/Http/Controllers/Auth/AuthController.php
  app/Http/Controllers/UserController.php
  app/Http/Controllers/DepotController.php
  app/Http/Middleware/CheckRole.php
  app/Http/Requests/Auth/LoginRequest.php
  app/Http/Requests/StoreUserRequest.php
  app/Http/Requests/UpdateUserRequest.php
  app/Policies/UserPolicy.php
  app/Policies/DepotPolicy.php
  database/migrations/0001_01_01_000010_create_depots_table.php
  database/migrations/0001_01_01_000011_create_users_extended_table.php
  database/seeders/DatabaseSeeder.php
  routes/api.php
  config/filesystems.php          ← add R2 disk
  tests/Feature/Auth/LoginTest.php
  tests/Feature/User/UserManagementTest.php
  tests/Feature/Depot/DepotManagementTest.php
```

### Frontend — Created
```
frontend/
  app/layout.tsx
  app/(auth)/login/page.tsx
  app/(auth)/login/LoginForm.tsx
  app/(dashboard)/layout.tsx
  app/(dashboard)/dashboard/page.tsx
  app/(dashboard)/admin/users/page.tsx
  app/api/auth/[...nextauth]/route.ts
  components/ui/Button.tsx
  components/ui/Card.tsx
  components/ui/Input.tsx
  components/ui/StatusChip.tsx
  components/shared/Sidebar.tsx
  components/shared/RoleGuard.tsx
  lib/api.ts
  lib/auth.ts
  middleware.ts
  tailwind.config.ts
  styles/globals.css
  stitch-reference/          ← HTML files from Stitch (read-only)
```

---

## Task 1: Init Monorepo + Git

**Files:**
- Create: `.gitignore`
- Create: `README.md`
- Create: `.env.example`

- [ ] **Step 1: Init git repo**

```bash
cd /c/Users/USER/projects/simhq
git init
git checkout -b main
```

- [ ] **Step 2: Create root .gitignore**

```bash
cat > .gitignore << 'EOF'
# Backend
backend/.env
backend/vendor/
backend/storage/logs/
backend/storage/framework/cache/
backend/storage/framework/sessions/
backend/storage/framework/views/
backend/bootstrap/cache/

# Frontend
frontend/.env.local
frontend/node_modules/
frontend/.next/

# OS
.DS_Store
Thumbs.db
*.log
EOF
```

- [ ] **Step 3: Create root .env.example**

```bash
cat > .env.example << 'EOF'
# === BACKEND ===
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=simhq
DB_USERNAME=postgres
DB_PASSWORD=

QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Cloudflare R2
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_DEFAULT_REGION=auto
R2_BUCKET=simhq-assets
R2_URL=https://<account_id>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://assets.simhq.id

# WAHA
WAHA_API_URL=http://localhost:3000
WAHA_SESSION_NAME=default

# === FRONTEND ===
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=change-this-to-a-random-string-min-32-chars
EOF
```

- [ ] **Step 4: Create README.md**

```bash
cat > README.md << 'EOF'
# SIM Hewan Qurban

Web-based qurban animal sales management system.

## Structure
- `backend/` — Laravel 11 API
- `frontend/` — Next.js 14 App

## Requirements
- PHP 8.2+, Composer
- Node.js 20+, npm
- PostgreSQL 16
- Redis

## Setup
See `backend/README.md` and `frontend/README.md`.
EOF
```

- [ ] **Step 5: Initial commit**

```bash
git add .gitignore README.md .env.example
git commit -m "chore: init monorepo structure"
```

---

## Task 2: Scaffold Laravel 11 Backend

**Files:** All files under `backend/`

- [ ] **Step 1: Create Laravel 11 project**

```bash
cd /c/Users/USER/projects/simhq
composer create-project laravel/laravel backend "^11.0"
```

Expected: `backend/` created with Laravel 11 boilerplate.

- [ ] **Step 2: Install Sanctum via artisan**

```bash
cd backend
php artisan install:api
```

Expected output: `INFO  API scaffolding installed. Please add the [Laravel\Sanctum\HasApiTokens] trait to your User model.`  
This creates `routes/api.php` and publishes Sanctum config.

- [ ] **Step 3: Install R2/S3 package**

```bash
composer require league/flysystem-aws-s3-v3 "^3.0"
```

- [ ] **Step 4: Copy .env**

```bash
cp .env.example .env
php artisan key:generate
```

- [ ] **Step 5: Configure .env for PostgreSQL**

Edit `backend/.env` — set these values:

```env
APP_NAME="SIM Hewan Qurban"
APP_ENV=local
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=simhq
DB_USERNAME=postgres
DB_PASSWORD=your_password

QUEUE_CONNECTION=sync
```

- [ ] **Step 6: Create PostgreSQL database**

```bash
# Run in psql or pgAdmin:
# CREATE DATABASE simhq;
# Or via psql:
psql -U postgres -c "CREATE DATABASE simhq;"
```

- [ ] **Step 7: Verify connection**

```bash
php artisan migrate:status
```

Expected: Lists default Laravel migrations (users, cache, jobs tables).

- [ ] **Step 8: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/
git commit -m "chore: scaffold Laravel 11 backend with Sanctum"
```

---

## Task 3: Database Migrations — Depots + Users

**Files:**
- Create: `backend/database/migrations/0001_01_01_000010_create_depots_table.php`
- Modify: existing users migration (extend columns)
- Create: `backend/database/migrations/0001_01_01_000011_extend_users_table.php`

- [ ] **Step 1: Create depots migration**

```bash
cd backend
php artisan make:migration create_depots_table
```

Edit the created file in `database/migrations/`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('depots', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->text('alamat')->nullable();
            $table->string('kota', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('depots');
    }
};
```

- [ ] **Step 2: Create users extension migration**

```bash
php artisan make:migration extend_users_table
```

Edit the created file:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('depot_id')
                ->nullable()
                ->constrained('depots')
                ->nullOnDelete()
                ->after('id');
            $table->string('role', 50)->default('ADMIN_ANGGOTA')->after('email');
            $table->string('divisi', 100)->nullable()->after('role');
            $table->string('phone', 20)->nullable()->after('divisi');
            $table->boolean('is_active')->default(true)->after('phone');
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['depot_id']);
            $table->dropColumn(['depot_id', 'role', 'divisi', 'phone', 'is_active', 'deleted_at']);
        });
    }
};
```

- [ ] **Step 3: Run migrations**

```bash
php artisan migrate
```

Expected: `DONE` for all migrations including depots and users extension.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/
git commit -m "feat(db): add depots table + extend users with role, depot_id, soft delete"
```

---

## Task 4: UserRole Enum + Models

**Files:**
- Create: `backend/app/Enums/UserRole.php`
- Modify: `backend/app/Models/User.php`
- Create: `backend/app/Models/Depot.php`

- [ ] **Step 1: Create UserRole enum**

```php
<?php
// backend/app/Enums/UserRole.php

namespace App\Enums;

enum UserRole: string
{
    case SUPER_ADMIN           = 'SUPER_ADMIN';
    case KEPALA_DEPOT          = 'KEPALA_DEPOT';
    case ADMIN_KETUA           = 'ADMIN_KETUA';
    case ADMIN_ANGGOTA         = 'ADMIN_ANGGOTA';
    case KANDANG_SAPI_KETUA    = 'KANDANG_SAPI_KETUA';
    case KANDANG_SAPI_ANGGOTA  = 'KANDANG_SAPI_ANGGOTA';
    case KANDANG_DOMBA_KETUA   = 'KANDANG_DOMBA_KETUA';
    case KANDANG_DOMBA_ANGGOTA = 'KANDANG_DOMBA_ANGGOTA';
    case CS_KETUA              = 'CS_KETUA';
    case CS_ANGGOTA            = 'CS_ANGGOTA';
    case LOGISTIK_KETUA        = 'LOGISTIK_KETUA';
    case LOGISTIK_ANGGOTA      = 'LOGISTIK_ANGGOTA';
    case PAKAN_KETUA           = 'PAKAN_KETUA';
    case PAKAN_ANGGOTA         = 'PAKAN_ANGGOTA';
    case KONSTRUKSI_KETUA      = 'KONSTRUKSI_KETUA';
    case KONSTRUKSI_ANGGOTA    = 'KONSTRUKSI_ANGGOTA';

    public function isAdmin(): bool
    {
        return in_array($this, [self::SUPER_ADMIN, self::KEPALA_DEPOT, self::ADMIN_KETUA]);
    }

    public function isSuperAdmin(): bool
    {
        return $this === self::SUPER_ADMIN;
    }
}
```

- [ ] **Step 2: Update User model**

Replace `backend/app/Models/User.php`:

```php
<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'depot_id', 'name', 'email', 'password',
        'role', 'divisi', 'phone', 'is_active',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
        'role'              => UserRole::class,
        'is_active'         => 'boolean',
    ];

    public function depot(): BelongsTo
    {
        return $this->belongsTo(Depot::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === UserRole::SUPER_ADMIN;
    }

    // Scope: limit queries to own depot unless SUPER_ADMIN
    public function scopeForDepot($query, ?int $depotId): void
    {
        if ($depotId !== null) {
            $query->where('depot_id', $depotId);
        }
    }
}
```

- [ ] **Step 3: Create Depot model**

```php
<?php
// backend/app/Models/Depot.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Depot extends Model
{
    use HasFactory;

    protected $fillable = ['nama', 'alamat', 'kota', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/
git commit -m "feat(auth): add UserRole enum, User model with Sanctum + SoftDeletes, Depot model"
```

---

## Task 5: Auth API — Login / Logout / Me

**Files:**
- Create: `backend/app/Http/Requests/Auth/LoginRequest.php`
- Create: `backend/app/Http/Controllers/Auth/AuthController.php`
- Create: `backend/tests/Feature/Auth/LoginTest.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write failing tests**

```php
<?php
// backend/tests/Feature/Auth/LoginTest.php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $depot = Depot::factory()->create();
        $this->user = User::factory()->create([
            'depot_id' => $depot->id,
            'email'    => 'admin@test.com',
            'password' => bcrypt('password123'),
            'role'     => UserRole::ADMIN_KETUA,
            'is_active' => true,
        ]);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email'    => 'admin@test.com',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email', 'role', 'depot_id'],
            ]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $this->postJson('/api/auth/login', [
            'email'    => 'admin@test.com',
            'password' => 'wrong',
        ])->assertUnprocessable()
          ->assertJsonValidationErrors(['email']);
    }

    public function test_login_fails_for_inactive_user(): void
    {
        $this->user->update(['is_active' => false]);

        $this->postJson('/api/auth/login', [
            'email'    => 'admin@test.com',
            'password' => 'password123',
        ])->assertUnprocessable()
          ->assertJsonValidationErrors(['email']);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $token = $this->user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'admin@test.com');
    }

    public function test_logout_revokes_token(): void
    {
        $token = $this->user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/auth/logout')
            ->assertOk();

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertUnauthorized();
    }
}
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd backend
php artisan test tests/Feature/Auth/LoginTest.php
```

Expected: FAIL — `Route [api/auth/login] not defined` or similar.

- [ ] **Step 3: Create factories for Depot and User**

```bash
php artisan make:factory DepotFactory --model=Depot
```

Edit `database/factories/DepotFactory.php`:

```php
<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class DepotFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nama'      => $this->faker->company() . ' Depot',
            'alamat'    => $this->faker->address(),
            'kota'      => $this->faker->city(),
            'is_active' => true,
        ];
    }
}
```

Edit `database/factories/UserFactory.php` — add `depot_id`, `role`, `divisi`, `phone`, `is_active`:

```php
<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\Depot;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'depot_id'  => Depot::factory(),
            'name'      => $this->faker->name(),
            'email'     => $this->faker->unique()->safeEmail(),
            'password'  => Hash::make('password'),
            'role'      => UserRole::ADMIN_ANGGOTA,
            'divisi'    => 'Admin',
            'phone'     => $this->faker->phoneNumber(),
            'is_active' => true,
        ];
    }

    public function superAdmin(): static
    {
        return $this->state(['role' => UserRole::SUPER_ADMIN, 'depot_id' => null]);
    }
}
```

- [ ] **Step 4: Create LoginRequest**

```php
<?php
// backend/app/Http/Requests/Auth/LoginRequest.php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ];
    }
}
```

- [ ] **Step 5: Create AuthController**

```php
<?php
// backend/app/Http/Controllers/Auth/AuthController.php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password) || ! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Kredensial tidak valid atau akun nonaktif.'],
            ]);
        }

        // Token expires in 8 hours
        $token = $user->createToken('auth_token', ['*'], now()->addHours(8))->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'       => $user->id,
                'name'     => $user->name,
                'email'    => $user->email,
                'role'     => $user->role->value,
                'depot_id' => $user->depot_id,
                'divisi'   => $user->divisi,
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('depot:id,nama');

        return response()->json([
            'user' => [
                'id'       => $user->id,
                'name'     => $user->name,
                'email'    => $user->email,
                'role'     => $user->role->value,
                'depot_id' => $user->depot_id,
                'depot'    => $user->depot,
                'divisi'   => $user->divisi,
                'phone'    => $user->phone,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }
}
```

- [ ] **Step 6: Register auth routes in api.php**

```php
<?php
// backend/routes/api.php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DepotController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Public
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
});

// Authenticated
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });

    // SUPER_ADMIN only
    Route::middleware('role:SUPER_ADMIN')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::apiResource('depots', DepotController::class);
    });
});
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
php artisan test tests/Feature/Auth/LoginTest.php
```

Expected: 5 tests pass. If any fail, fix before proceeding.

- [ ] **Step 8: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/
git commit -m "feat(auth): implement login/logout/me endpoints with Sanctum 8h token"
```

---

## Task 6: RBAC Middleware

**Files:**
- Create: `backend/app/Http/Middleware/CheckRole.php`
- Modify: `backend/bootstrap/app.php`

- [ ] **Step 1: Create CheckRole middleware**

```php
<?php
// backend/app/Http/Middleware/CheckRole.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $userRole = $user->role->value;

        if (! in_array($userRole, $roles)) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        return $next($request);
    }
}
```

- [ ] **Step 2: Register middleware alias in bootstrap/app.php**

Find `->withMiddleware(function (Middleware $middleware) {` in `bootstrap/app.php` and add:

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'role' => \App\Http\Middleware\CheckRole::class,
    ]);
})
```

- [ ] **Step 3: Test RBAC manually**

```bash
# Start server
php artisan serve --port=8000 &

# Login as admin (not SUPER_ADMIN)
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
# Note the token

# Try GET /api/users — should return 403
curl -s http://localhost:8000/api/users \
  -H "Authorization: Bearer {token}"
# Expected: {"message":"Akses ditolak."}
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Middleware/ backend/bootstrap/
git commit -m "feat(auth): add CheckRole middleware for RBAC enforcement"
```

---

## Task 7: User + Depot CRUD API

**Files:**
- Create: `backend/app/Http/Requests/StoreUserRequest.php`
- Create: `backend/app/Http/Requests/UpdateUserRequest.php`
- Create: `backend/app/Http/Controllers/UserController.php`
- Create: `backend/app/Http/Controllers/DepotController.php`
- Create: `backend/tests/Feature/User/UserManagementTest.php`
- Create: `backend/tests/Feature/Depot/DepotManagementTest.php`

- [ ] **Step 1: Write failing tests for User CRUD**

```php
<?php
// backend/tests/Feature/User/UserManagementTest.php

namespace Tests\Feature\User;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Depot $depot;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot = Depot::factory()->create();
        $this->superAdmin = User::factory()->superAdmin()->create();
    }

    public function test_super_admin_can_list_users(): void
    {
        User::factory()->count(3)->create(['depot_id' => $this->depot->id]);

        $this->actingAs($this->superAdmin)
            ->getJson('/api/users')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'email', 'role', 'depot_id']]]);
    }

    public function test_super_admin_can_create_user(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/users', [
                'depot_id' => $this->depot->id,
                'name'     => 'Budi Santoso',
                'email'    => 'budi@test.com',
                'password' => 'password123',
                'role'     => 'ADMIN_ANGGOTA',
                'divisi'   => 'Admin',
                'phone'    => '08123456789',
            ])
            ->assertCreated()
            ->assertJsonPath('user.email', 'budi@test.com');
    }

    public function test_super_admin_can_update_user_role(): void
    {
        $user = User::factory()->create(['depot_id' => $this->depot->id]);

        $this->actingAs($this->superAdmin)
            ->putJson("/api/users/{$user->id}", ['role' => 'CS_ANGGOTA'])
            ->assertOk()
            ->assertJsonPath('user.role', 'CS_ANGGOTA');
    }

    public function test_super_admin_can_deactivate_user(): void
    {
        $user = User::factory()->create(['depot_id' => $this->depot->id]);

        $this->actingAs($this->superAdmin)
            ->deleteJson("/api/users/{$user->id}")
            ->assertOk();

        $this->assertSoftDeleted('users', ['id' => $user->id]);
    }

    public function test_non_super_admin_cannot_access_users(): void
    {
        $regular = User::factory()->create(['depot_id' => $this->depot->id]);

        $this->actingAs($regular)
            ->getJson('/api/users')
            ->assertForbidden();
    }
}
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd backend
php artisan test tests/Feature/User/UserManagementTest.php
```

Expected: FAIL — controller not found.

- [ ] **Step 3: Create StoreUserRequest**

```php
<?php
// backend/app/Http/Requests/StoreUserRequest.php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id' => ['nullable', 'exists:depots,id'],
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role'     => ['required', Rule::enum(UserRole::class)],
            'divisi'   => ['nullable', 'string', 'max:100'],
            'phone'    => ['nullable', 'string', 'max:20'],
        ];
    }
}
```

- [ ] **Step 4: Create UpdateUserRequest**

```php
<?php
// backend/app/Http/Requests/UpdateUserRequest.php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id'  => ['sometimes', 'nullable', 'exists:depots,id'],
            'name'      => ['sometimes', 'string', 'max:255'],
            'email'     => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($this->route('user'))],
            'password'  => ['sometimes', 'string', 'min:8'],
            'role'      => ['sometimes', Rule::enum(UserRole::class)],
            'divisi'    => ['sometimes', 'nullable', 'string', 'max:100'],
            'phone'     => ['sometimes', 'nullable', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
```

- [ ] **Step 5: Create UserController**

```php
<?php
// backend/app/Http/Controllers/UserController.php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::with('depot:id,nama')
            ->orderBy('name')
            ->paginate(50);

        return response()->json($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        return response()->json(['user' => $user], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['user' => $user->load('depot:id,nama')]);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $user->update($request->validated());

        return response()->json(['user' => $user->fresh()]);
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete(); // soft delete

        return response()->json(['message' => 'User dinonaktifkan.']);
    }
}
```

- [ ] **Step 6: Create DepotController**

```php
<?php
// backend/app/Http/Controllers/DepotController.php

namespace App\Http\Controllers;

use App\Models\Depot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepotController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Depot::all()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nama'   => ['required', 'string', 'max:255'],
            'alamat' => ['nullable', 'string'],
            'kota'   => ['nullable', 'string', 'max:100'],
        ]);

        $depot = Depot::create($data);

        return response()->json(['depot' => $depot], 201);
    }

    public function show(Depot $depot): JsonResponse
    {
        return response()->json(['depot' => $depot->load('users')]);
    }

    public function update(Request $request, Depot $depot): JsonResponse
    {
        $data = $request->validate([
            'nama'      => ['sometimes', 'string', 'max:255'],
            'alamat'    => ['sometimes', 'nullable', 'string'],
            'kota'      => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $depot->update($data);

        return response()->json(['depot' => $depot->fresh()]);
    }

    public function destroy(Depot $depot): JsonResponse
    {
        $depot->update(['is_active' => false]);

        return response()->json(['message' => 'Depot dinonaktifkan.']);
    }
}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
php artisan test tests/Feature/
```

Expected: All tests pass (LoginTest + UserManagementTest).

- [ ] **Step 8: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/
git commit -m "feat(users): add User + Depot CRUD API with RBAC protection"
```

---

## Task 8: Seeder — Super Admin + Sample Depot

**Files:**
- Modify: `backend/database/seeders/DatabaseSeeder.php`

- [ ] **Step 1: Update DatabaseSeeder**

```php
<?php
// backend/database/seeders/DatabaseSeeder.php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $depot = Depot::firstOrCreate(
            ['nama' => 'Depot Utama'],
            ['alamat' => 'Jl. Contoh No. 1', 'kota' => 'Jakarta', 'is_active' => true]
        );

        // SUPER_ADMIN — no depot
        User::firstOrCreate(
            ['email' => 'superadmin@simhq.id'],
            [
                'name'      => 'Super Admin',
                'password'  => Hash::make('Admin@12345'),
                'role'      => UserRole::SUPER_ADMIN,
                'is_active' => true,
            ]
        );

        // Kepala Depot for Depot Utama
        User::firstOrCreate(
            ['email' => 'kepala@simhq.id'],
            [
                'depot_id'  => $depot->id,
                'name'      => 'Kepala Depot Utama',
                'password'  => Hash::make('Kepala@12345'),
                'role'      => UserRole::KEPALA_DEPOT,
                'is_active' => true,
            ]
        );
    }
}
```

- [ ] **Step 2: Run seeder**

```bash
cd backend
php artisan db:seed
```

Expected: `INFO  Seeding database.`

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/seeders/
git commit -m "feat(seed): add SUPER_ADMIN + Kepala Depot seed data"
```

---

## Task 9: Cloudflare R2 Config

**Files:**
- Modify: `backend/config/filesystems.php`

- [ ] **Step 1: Add R2 disk to filesystems.php**

Open `backend/config/filesystems.php`, add to the `disks` array:

```php
'r2' => [
    'driver'                  => 's3',
    'key'                     => env('R2_ACCESS_KEY_ID'),
    'secret'                  => env('R2_SECRET_ACCESS_KEY'),
    'region'                  => env('R2_DEFAULT_REGION', 'auto'),
    'bucket'                  => env('R2_BUCKET'),
    'url'                     => env('R2_PUBLIC_URL'),
    'endpoint'                => env('R2_URL'),
    'use_path_style_endpoint' => true,
],
```

Also set `'default' => env('FILESYSTEM_DISK', 'local'),` (already default in Laravel).

- [ ] **Step 2: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/config/filesystems.php
git commit -m "chore: configure Cloudflare R2 as S3-compatible storage disk"
```

---

## Task 10: Scaffold Next.js 14 Frontend

**Files:** All files under `frontend/`

- [ ] **Step 1: Create Next.js 14 project**

```bash
cd /c/Users/USER/projects/simhq
npx create-next-app@14 frontend \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --no-git
```

Answer prompts: accept defaults.

- [ ] **Step 2: Install dependencies**

```bash
cd frontend
npm install next-auth@beta
npm install axios
npm install @tanstack/react-query
npm install lucide-react
```

- [ ] **Step 3: Create .env.local**

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-change-in-production-min-32-chars
EOF
```

- [ ] **Step 4: Verify Next.js starts**

```bash
npm run dev -- --port 3000 &
```

Open `http://localhost:3000` — should show default Next.js page.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/
git commit -m "chore: scaffold Next.js 14 frontend with TypeScript, Tailwind, App Router"
```

---

## Task 11: Tailwind Design Tokens + Global CSS

**Files:**
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/app/globals.css`

- [ ] **Step 1: Update tailwind.config.ts**

```typescript
// frontend/tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:     '#2779a7',
        'primary-c': '#1e6090',
        brand:       '#3491be',
        'primary-f': '#a8d8f0',
        accent:      '#ECD06F',
        'accent-dim':'#d4b84e',
        'on-accent': '#1a1200',
        surface: {
          lowest:  '#ffffff',
          low:     '#f0f7fc',
          DEFAULT: '#e3f0f8',
          high:    '#d6e8f4',
          highest: '#c9e0f0',
        },
        'on-surface':         '#0a1f2e',
        'on-surface-variant': '#2d4a5e',
        'on-primary':         '#ffffff',
        error:                '#ba1a1a',
        tertiary:             '#a72d51',
        'secondary-c':        '#dbeef8',
      },
      fontFamily: {
        display: ['var(--font-manrope)', 'sans-serif'],
        body:    ['var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        sm:   '2px',
        md:   '6px',
        lg:   '8px',
        xl:   '12px',
        '2xl':'16px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 8px 32px rgba(10, 31, 46, 0.06)',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Update globals.css**

```css
/* frontend/app/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-manrope: 'Manrope', sans-serif;
  --font-inter:   'Inter', sans-serif;
}

@layer base {
  body {
    @apply bg-surface-low text-on-surface font-body;
  }

  h1, h2, h3 {
    @apply font-display;
  }
}

@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center px-6 py-2.5
           rounded-xl text-on-primary font-display font-semibold
           transition-opacity hover:opacity-90 active:opacity-80;
    background: linear-gradient(135deg, #2779a7, #1e6090);
  }

  .btn-accent {
    @apply inline-flex items-center justify-center px-6 py-2.5
           rounded-xl text-on-accent font-display font-semibold
           transition-opacity hover:opacity-90;
    background: linear-gradient(135deg, #ECD06F, #d4b84e);
  }

  .input-field {
    @apply w-full bg-surface-highest border-none rounded-md px-3 py-2
           text-on-surface placeholder-on-surface-variant
           focus:outline-none focus:ring-2 focus:ring-primary/30
           transition-shadow;
  }

  .card {
    @apply bg-surface-lowest rounded-lg shadow-card p-6;
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/tailwind.config.ts frontend/app/globals.css
git commit -m "feat(ui): add Tailwind design tokens — blue/white/gold palette"
```

---

## Task 12: UI Primitives (Button, Card, Input, StatusChip)

**Files:**
- Create: `frontend/components/ui/Button.tsx`
- Create: `frontend/components/ui/Card.tsx`
- Create: `frontend/components/ui/Input.tsx`
- Create: `frontend/components/ui/StatusChip.tsx`

- [ ] **Step 1: Create Button component**

```tsx
// frontend/components/ui/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-display font-semibold text-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'

    const variants: Record<Variant, string> = {
      primary:   'btn-primary',
      accent:    'btn-accent',
      secondary: 'bg-secondary-c text-on-surface hover:opacity-80',
      ghost:     'text-primary hover:bg-surface-high',
      danger:    'bg-tertiary text-white hover:opacity-90',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], className)}
        {...props}
      >
        {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
```

- [ ] **Step 2: Create Card component**

```tsx
// frontend/components/ui/Card.tsx
import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('font-display font-semibold text-on-surface', className)} {...props}>
      {children}
    </h3>
  )
}
```

- [ ] **Step 3: Create Input component**

```tsx
// frontend/components/ui/Input.tsx
import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn('input-field', error && 'ring-2 ring-error/50', className)}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
```

- [ ] **Step 4: Create StatusChip component**

```tsx
// frontend/components/ui/StatusChip.tsx
import { cn } from '@/lib/utils'

type Status = 'TERSEDIA' | 'DIPESAN' | 'TERJUAL' | 'MATI' | 'AKTIF' | 'NONAKTIF'

const statusConfig: Record<Status, { bg: string; text: string; label: string }> = {
  TERSEDIA: { bg: 'bg-[#dcfce7]', text: 'text-[#15803d]', label: 'Tersedia' },
  DIPESAN:  { bg: 'bg-[#fef9c3]', text: 'text-[#854d0e]', label: 'Dipesan' },
  TERJUAL:  { bg: 'bg-[#dbeef8]', text: 'text-primary',   label: 'Terjual' },
  MATI:     { bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]', label: 'Mati' },
  AKTIF:    { bg: 'bg-[#dcfce7]', text: 'text-[#15803d]', label: 'Aktif' },
  NONAKTIF: { bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]', label: 'Nonaktif' },
}

interface StatusChipProps {
  status: Status
  className?: string
}

export function StatusChip({ status, className }: StatusChipProps) {
  const config = statusConfig[status]

  return (
    <span className={cn(
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium',
      config.bg, config.text, className
    )}>
      {config.label}
    </span>
  )
}
```

- [ ] **Step 5: Create utils helper**

```typescript
// frontend/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

```bash
cd frontend
npm install clsx tailwind-merge
```

- [ ] **Step 6: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/components/ frontend/lib/utils.ts
git commit -m "feat(ui): add Button, Card, Input, StatusChip primitives"
```

---

## Task 13: NextAuth v5 Config + API Client

**Files:**
- Create: `frontend/lib/auth.ts`
- Create: `frontend/app/api/auth/[...nextauth]/route.ts`
- Create: `frontend/lib/api.ts`
- Create: `frontend/middleware.ts`

- [ ] **Step 1: Create auth.ts (NextAuth v5 config)**

```typescript
// frontend/lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email:    credentials.email,
              password: credentials.password,
            }),
          })

          if (!res.ok) return null

          const data = await res.json()

          return {
            id:       String(data.user.id),
            name:     data.user.name,
            email:    data.user.email,
            role:     data.user.role,
            depotId:  data.user.depot_id,
            token:    data.token,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role    = (user as any).role
        token.depotId = (user as any).depotId
        token.apiToken = (user as any).token
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role     = token.role
        ;(session.user as any).depotId = token.depotId
        ;(session.user as any).token   = token.apiToken
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge:   8 * 60 * 60, // 8 hours — matches Sanctum token expiry
  },
})
```

- [ ] **Step 2: Create NextAuth route handler**

```typescript
// frontend/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 3: Create API client**

```typescript
// frontend/lib/api.ts
import axios from 'axios'
import { getSession } from 'next-auth/react'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const session = await getSession()
  if (session?.user && (session.user as any).token) {
    config.headers.Authorization = `Bearer ${(session.user as any).token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

- [ ] **Step 4: Create middleware.ts (route protection)**

```typescript
// frontend/middleware.ts
export { auth as middleware } from '@/lib/auth'

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|katalog|login).*)',
  ],
}
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/lib/auth.ts frontend/lib/api.ts \
        frontend/app/api/ frontend/middleware.ts
git commit -m "feat(auth): add NextAuth v5 credentials + Sanctum token forwarding + route protection"
```

---

## Task 14: Login Page (Stitch Reference)

**Files:**
- Modify: `frontend/app/layout.tsx`
- Create: `frontend/app/(auth)/login/page.tsx`
- Create: `frontend/app/(auth)/login/LoginForm.tsx`

- [ ] **Step 1: Download Stitch login screen HTML for reference**

```bash
cd /c/Users/USER/projects/simhq/frontend
mkdir -p stitch-reference
# Download HTML from Stitch screen URLs (reference only, do not ship)
curl -L "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzUxMzBjMWVmNjhjNzRkNzdiN2VkYzJjZDAwM2Y2MmUzEgsSBxDSiMPm_h0YAZIBIwoKcHJvamVjdF9pZBIVQhM2NzExMzkwMzkyODc3ODIzNTkz&filename=&opi=96797242" \
  -o stitch-reference/login-v1.html 2>/dev/null || echo "Save manually from Stitch project"
```

- [ ] **Step 2: Update root layout**

```tsx
// frontend/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from 'next-auth/react'

export const metadata: Metadata = {
  title: 'SIM Hewan Qurban',
  description: 'Sistem Informasi Manajemen Penjualan Hewan Qurban',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create LoginForm component**

```tsx
// frontend/app/(auth)/login/LoginForm.tsx
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    const result = await signIn('credentials', {
      email:    formData.get('email') as string,
      password: formData.get('password') as string,
      redirect: false,
    })

    if (result?.error) {
      setError('Email atau password salah.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        placeholder="admin@depot.id"
        required
        autoComplete="email"
      />
      <Input
        id="password"
        name="password"
        type="password"
        label="Password"
        placeholder="••••••••"
        required
        autoComplete="current-password"
      />

      {error && (
        <p className="text-sm text-error bg-[#fee2e2] px-4 py-2 rounded-md">{error}</p>
      )}

      <Button type="submit" loading={loading} className="w-full mt-2">
        Masuk
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Create login page**

```tsx
// frontend/app/(auth)/login/page.tsx
import { Card } from '@/components/ui/Card'
import { LoginForm } from './LoginForm'

export const metadata = { title: 'Login — SIM Hewan Qurban' }

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-surface-low flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #2779a7, #1e6090)' }}
          >
            <span className="text-white font-display font-bold text-xl">SQ</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-on-surface">
            SIM Hewan Qurban
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Sistem Manajemen Depot Qurban
          </p>
        </div>

        <Card>
          <h2 className="font-display font-semibold text-lg text-on-surface mb-6">
            Masuk ke Akun
          </h2>
          <LoginForm />
        </Card>

        <p className="text-center text-xs text-on-surface-variant mt-6">
          &copy; 2026 SIM Hewan Qurban. Hak cipta dilindungi.
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/app/ frontend/stitch-reference/
git commit -m "feat(ui): add login page with Stitch design reference"
```

---

## Task 15: Dashboard Layout + Sidebar

**Files:**
- Create: `frontend/components/shared/Sidebar.tsx`
- Create: `frontend/components/shared/RoleGuard.tsx`
- Create: `frontend/app/(dashboard)/layout.tsx`
- Create: `frontend/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Create Sidebar component**

```tsx
// frontend/components/shared/Sidebar.tsx
'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  Wallet, Truck, ClipboardList, LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  roles?: string[]
}

const navItems: NavItem[] = [
  { href: '/dashboard',     label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/pos',           label: 'POS Penjualan',icon: ShoppingCart,    roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA','ADMIN_ANGGOTA'] },
  { href: '/pengadaan',     label: 'Pengadaan',    icon: Package,         roles: ['SUPER_ADMIN','KEPALA_DEPOT','KANDANG_SAPI_KETUA','KANDANG_DOMBA_KETUA'] },
  { href: '/keuangan',      label: 'Keuangan',     icon: Wallet,          roles: ['SUPER_ADMIN','KEPALA_DEPOT'] },
  { href: '/pengiriman',    label: 'Pengiriman',   icon: Truck,           roles: ['SUPER_ADMIN','KEPALA_DEPOT','LOGISTIK_KETUA','LOGISTIK_ANGGOTA'] },
  { href: '/absensi',       label: 'Absensi',      icon: ClipboardList },
  { href: '/admin/users',   label: 'Manaj. User',  icon: Users,           roles: ['SUPER_ADMIN'] },
]

export function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const userRole = (session?.user as any)?.role ?? ''

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  )

  return (
    <aside className="w-64 min-h-screen bg-surface flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-surface-high">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2779a7, #1e6090)' }}
          >
            <span className="text-white font-display font-bold text-sm">SQ</span>
          </div>
          <div>
            <p className="font-display font-semibold text-sm text-on-surface leading-tight">SIM Qurban</p>
            <p className="text-xs text-on-surface-variant">{(session?.user as any)?.depotId ? 'Depot' : 'Admin Pusat'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-colors',
                active
                  ? 'bg-primary text-on-primary font-medium'
                  : 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-surface-high">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-body font-medium text-on-surface truncate">{session?.user?.name}</p>
          <p className="text-xs text-on-surface-variant">{userRole.replace(/_/g, ' ')}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-tertiary hover:bg-[#fee2e2] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create RoleGuard component**

```tsx
// frontend/components/shared/RoleGuard.tsx
'use client'

import { useSession } from 'next-auth/react'

interface RoleGuardProps {
  roles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role ?? ''

  if (!roles.includes(userRole)) return <>{fallback}</>
  return <>{children}</>
}
```

- [ ] **Step 3: Create dashboard layout**

```tsx
// frontend/app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/shared/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-low">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Create dashboard index page**

```tsx
// frontend/app/(dashboard)/dashboard/page.tsx
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

export const metadata = { title: 'Dashboard — SIM Hewan Qurban' }

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-on-surface">Dashboard</h1>
        <p className="text-sm text-on-surface-variant mt-1">Selamat datang di SIM Hewan Qurban</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Hewan</CardTitle>
          </CardHeader>
          <p className="font-display font-bold text-3xl text-primary">—</p>
          <p className="text-xs text-on-surface-variant mt-1">Data akan tersedia setelah T-03</p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Penjualan</CardTitle>
          </CardHeader>
          <p className="font-display font-bold text-3xl text-accent">—</p>
          <p className="text-xs text-on-surface-variant mt-1">Data akan tersedia setelah T-05</p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kas Hari Ini</CardTitle>
          </CardHeader>
          <p className="font-display font-bold text-3xl text-on-surface">—</p>
          <p className="text-xs text-on-surface-variant mt-1">Data akan tersedia setelah T-10</p>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/components/shared/ frontend/app/\(dashboard\)/
git commit -m "feat(ui): add Sidebar with role-based nav + dashboard layout + placeholder dashboard"
```

---

## Task 16: Admin Users Page (T-01 Frontend Complete)

**Files:**
- Create: `frontend/app/(dashboard)/admin/users/page.tsx`

- [ ] **Step 1: Create users management page**

```tsx
// frontend/app/(dashboard)/admin/users/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import { RoleGuard } from '@/components/shared/RoleGuard'
import api from '@/lib/api'

interface User {
  id: number
  name: string
  email: string
  role: string
  divisi: string | null
  is_active: boolean
  depot: { id: number; nama: string } | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/users')
      .then((res) => setUsers(res.data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <RoleGuard
      roles={['SUPER_ADMIN']}
      fallback={<p className="text-on-surface-variant">Akses ditolak.</p>}
    >
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-on-surface">Manajemen User</h1>
            <p className="text-sm text-on-surface-variant mt-1">Kelola akun dan role pengguna</p>
          </div>
          <Button>+ Tambah User</Button>
        </div>

        <Card>
          {loading ? (
            <p className="text-on-surface-variant text-sm">Memuat data...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">Nama</th>
                    <th className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">Role</th>
                    <th className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">Depot</th>
                    <th className="pb-3 text-xs uppercase tracking-widest text-on-surface-variant font-body">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y-0">
                  {users.map((user, i) => (
                    <tr key={user.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                      <td className="py-3 pr-4">
                        <p className="font-body font-medium text-on-surface">{user.name}</p>
                        <p className="text-xs text-on-surface-variant">{user.email}</p>
                      </td>
                      <td className="py-3 pr-4 text-on-surface-variant font-body">
                        {user.role.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 pr-4 text-on-surface-variant font-body">
                        {user.depot?.nama ?? '—'}
                      </td>
                      <td className="py-3">
                        <StatusChip status={user.is_active ? 'AKTIF' : 'NONAKTIF'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-center text-on-surface-variant py-8 text-sm">Belum ada user.</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </RoleGuard>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/app/\(dashboard\)/admin/
git commit -m "feat(ui): add admin users page with role guard and data table"
```

---

## Task 17: End-to-End Smoke Test

- [ ] **Step 1: Start backend**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan serve --port=8000
```

- [ ] **Step 2: Start frontend**

```bash
cd /c/Users/USER/projects/simhq/frontend
npm run dev -- --port 3000
```

- [ ] **Step 3: Smoke test login flow**

Open `http://localhost:3000/login`.

Test A — wrong credentials:
- Email: `superadmin@simhq.id`, Password: `wrong`
- Expected: "Email atau password salah." error shown

Test B — valid login:
- Email: `superadmin@simhq.id`, Password: `Admin@12345`
- Expected: redirect to `/dashboard`

Test C — sidebar shows "Manaj. User" for SUPER_ADMIN:
- Expected: `/admin/users` link visible in sidebar

Test D — visit `/admin/users`:
- Expected: user table loads (shows seeded SUPER_ADMIN + Kepala Depot)

Test E — non-SUPER_ADMIN sees "Akses ditolak":
- Logout → login as `kepala@simhq.id` / `Kepala@12345`
- Visit `/admin/users` directly
- Expected: "Akses ditolak." message, no user table

- [ ] **Step 4: Run all backend tests**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan test
```

Expected: All tests pass.

- [ ] **Step 5: Tag T-01 complete**

```bash
cd /c/Users/USER/projects/simhq
git tag t-01-complete
git log --oneline | head -20
```

---

## Task 18: Update TASKS.md + Final Commit

**Files:**
- Modify: `docs/TASKS.md`
- Modify: `docs/tasks/T-01-auth-role-management.md`

- [ ] **Step 1: Update T-01 task file status**

Change `**Status:** \`TODO\`` to `**Status:** \`DONE\`` in `docs/tasks/T-01-auth-role-management.md`.

- [ ] **Step 2: Update TASKS.md table**

Change `| [T-01]... | \`⬜ TODO\` |` to `| [T-01]... | \`✅ DONE\` |` in `docs/TASKS.md`.

- [ ] **Step 3: Final commit**

```bash
cd /c/Users/USER/projects/simhq
git add docs/
git commit -m "docs: mark T-01 as DONE"
git log --oneline | head -20
```

---

## Acceptance Criteria Checklist

- [ ] `POST /api/auth/login` returns `{token, user}` with valid credentials
- [ ] Token expires in 8 hours (Sanctum `expiresAt`)
- [ ] 16 roles defined in `UserRole` enum
- [ ] Every API route protected by `auth:sanctum` + optional `role:` middleware
- [ ] `SUPER_ADMIN` (depot_id = null) can access all routes
- [ ] Non-SUPER_ADMIN gets 403 on `/api/users`
- [ ] Login page renders at `http://localhost:3000/login`
- [ ] Successful login redirects to `/dashboard`
- [ ] Unauthenticated access to `/dashboard` redirects to `/login`
- [ ] Sidebar shows role-appropriate nav items
- [ ] `/admin/users` accessible only to `SUPER_ADMIN`
- [ ] All PHPUnit tests pass: `php artisan test`
