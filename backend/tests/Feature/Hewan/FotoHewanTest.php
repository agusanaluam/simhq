<?php

namespace Tests\Feature\Hewan;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\FotoHewan;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FotoHewanTest extends TestCase
{
    use RefreshDatabase;

    private User  $kandang;
    private Depot $depot;
    private Hewan $hewan;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->depot   = Depot::factory()->create();
        $this->kandang = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KANDANG_SAPI_KETUA,
        ]);

        $kelas         = KelasHewan::create(['kode' => 'A', 'nama' => 'Kelas A', 'urutan' => 1]);
        $supplier      = Supplier::create(['nama' => 'GUM', 'is_gum' => true, 'is_active' => true]);
        $this->hewan   = Hewan::create([
            'depot_id'      => $this->depot->id,
            'supplier_id'   => $supplier->id,
            'kelas_asal_id' => $kelas->id,
            'kelas_jual_id' => $kelas->id,
            'no_hewan'      => '001',
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300.00,
            'tgl_masuk'     => today()->toDateString(),
            'musim'         => (int) date('Y'),
            'status'        => 'AVAILABLE',
        ]);
    }

    private function fakeJpg(): UploadedFile
    {
        return UploadedFile::fake()->image('hewan.jpg', 600, 400);
    }

    // ─── index ───────────────────────────────────────────────────────────────

    public function test_can_list_fotos(): void
    {
        FotoHewan::create(['hewan_id' => $this->hewan->id, 'url' => 'hewan/1/test.jpg', 'urutan' => 1]);

        $res = $this->actingAs($this->kandang)
            ->getJson("/api/hewan/{$this->hewan->id}/foto");

        $res->assertOk()->assertJsonStructure(['data' => [['id', 'url', 'urutan', 'foto_url']]]);
        $this->assertCount(1, $res->json('data'));
    }

    // ─── store ───────────────────────────────────────────────────────────────

    public function test_can_upload_foto(): void
    {
        $res = $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/foto", [
                'foto'   => $this->fakeJpg(),
                'urutan' => 1,
            ]);

        $res->assertCreated()
            ->assertJsonStructure(['foto' => ['id', 'url', 'urutan'], 'url']);

        $this->assertDatabaseHas('foto_hewan', ['hewan_id' => $this->hewan->id, 'urutan' => 1]);

        $storedUrl = $res->json('foto.url');
        Storage::disk('public')->assertExists($storedUrl);
    }

    public function test_upload_validates_file_type(): void
    {
        $pdf = UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf');

        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/foto", ['foto' => $pdf, 'urutan' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['foto']);
    }

    public function test_upload_validates_max_size(): void
    {
        $big = UploadedFile::fake()->image('big.jpg')->size(6000); // 6MB

        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/foto", ['foto' => $big, 'urutan' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['foto']);
    }

    public function test_upload_rejects_more_than_2_fotos(): void
    {
        FotoHewan::create(['hewan_id' => $this->hewan->id, 'url' => 'hewan/1/a.jpg', 'urutan' => 1]);
        FotoHewan::create(['hewan_id' => $this->hewan->id, 'url' => 'hewan/1/b.jpg', 'urutan' => 2]);

        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/foto", ['foto' => $this->fakeJpg(), 'urutan' => 1])
            ->assertUnprocessable();
    }

    public function test_cannot_upload_to_other_depots_hewan(): void
    {
        $otherDepot = Depot::factory()->create();
        $kelas      = KelasHewan::first();
        $otherHewan = Hewan::create([
            'depot_id'      => $otherDepot->id,
            'supplier_id'   => $this->hewan->supplier_id,
            'kelas_asal_id' => $kelas->id,
            'kelas_jual_id' => $kelas->id,
            'no_hewan'      => '002',
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 200,
            'tgl_masuk'     => today()->toDateString(),
            'musim'         => (int) date('Y'),
            'status'        => 'AVAILABLE',
        ]);

        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$otherHewan->id}/foto", ['foto' => $this->fakeJpg(), 'urutan' => 1])
            ->assertForbidden();
    }

    // ─── destroy ─────────────────────────────────────────────────────────────

    public function test_can_delete_foto(): void
    {
        $foto = FotoHewan::create([
            'hewan_id' => $this->hewan->id,
            'url'      => 'hewan/1/test.jpg',
            'urutan'   => 1,
        ]);

        $res = $this->actingAs($this->kandang)
            ->deleteJson("/api/hewan/{$this->hewan->id}/foto/{$foto->id}");

        $res->assertOk()->assertJsonPath('message', 'Foto dihapus.');
        $this->assertDatabaseMissing('foto_hewan', ['id' => $foto->id]);
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson("/api/hewan/{$this->hewan->id}/foto")->assertUnauthorized();
    }
}
