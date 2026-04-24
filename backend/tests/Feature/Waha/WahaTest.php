<?php

namespace Tests\Feature\Waha;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\User;
use App\Models\WaLog;
use App\Services\WahaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WahaTest extends TestCase
{
    use RefreshDatabase;

    private Depot $depot;
    private User  $kepala;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot  = Depot::factory()->create();
        $this->kepala = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
            'phone'    => '081234567890',
        ]);
    }

    // ─── WahaService ─────────────────────────────────────────────────────────

    public function test_waha_service_skips_when_url_not_configured(): void
    {
        config(['services.waha.url' => '']);

        WahaService::send($this->depot->id, '081234567890', 'Test', 'test');

        $this->assertDatabaseCount('wa_log', 0);
    }

    public function test_waha_service_creates_log_when_url_configured(): void
    {
        Http::fake(['*' => Http::response(['id' => 'msg-001'], 200)]);
        config(['services.waha.url' => 'http://localhost:3000']);

        WahaService::send($this->depot->id, '081234567890', 'Test message', 'test_trigger');

        $this->assertDatabaseHas('wa_log', [
            'depot_id'     => $this->depot->id,
            'triggered_by' => 'test_trigger',
        ]);
    }

    public function test_waha_service_normalizes_phone_to_62_prefix(): void
    {
        Http::fake(['*' => Http::response([], 200)]);
        config(['services.waha.url' => 'http://localhost:3000']);

        WahaService::send($this->depot->id, '081234567890', 'Test', 'test');

        $log = WaLog::first();
        $this->assertStringStartsWith('62', $log->penerima);
    }

    public function test_send_job_marks_sent_on_success(): void
    {
        Http::fake(['*' => Http::response(['id' => 'msg-001'], 200)]);
        config(['services.waha.url' => 'http://localhost:3000']);

        $log = WaLog::create([
            'depot_id'     => $this->depot->id,
            'penerima'     => '6281234567890',
            'pesan'        => 'Test',
            'status'       => 'QUEUED',
            'triggered_by' => 'test',
        ]);

        (new \App\Jobs\SendWhatsAppMessage($log->id))->handle();

        $this->assertEquals('SENT', WaLog::find($log->id)->status);
    }

    public function test_send_job_marks_failed_on_http_error(): void
    {
        Http::fake(['*' => Http::response(['error' => 'Not found'], 404)]);
        config(['services.waha.url' => 'http://localhost:3000']);

        $log = WaLog::create([
            'depot_id'     => $this->depot->id,
            'penerima'     => '6281234567890',
            'pesan'        => 'Test',
            'status'       => 'QUEUED',
            'triggered_by' => 'test',
        ]);

        (new \App\Jobs\SendWhatsAppMessage($log->id))->handle();

        $this->assertEquals('FAILED', WaLog::find($log->id)->status);
    }

    public function test_send_job_marks_failed_on_connection_exception(): void
    {
        Http::fake(['*' => function () { throw new \Exception('Connection refused'); }]);
        config(['services.waha.url' => 'http://localhost:3000']);

        $log = WaLog::create([
            'depot_id'     => $this->depot->id,
            'penerima'     => '6281234567890',
            'pesan'        => 'Test',
            'status'       => 'QUEUED',
            'triggered_by' => 'test',
        ]);

        (new \App\Jobs\SendWhatsAppMessage($log->id))->handle();

        $this->assertEquals('FAILED', WaLog::find($log->id)->status);
    }

    // ─── wa-log endpoint ─────────────────────────────────────────────────────

    public function test_kepala_can_list_wa_logs(): void
    {
        WaLog::create([
            'depot_id'     => $this->depot->id,
            'penerima'     => '628123',
            'pesan'        => 'Test',
            'status'       => 'SENT',
            'triggered_by' => 'test',
        ]);

        $res = $this->actingAs($this->kepala)->getJson('/api/admin/wa-log');

        $res->assertOk()->assertJsonStructure(['data' => ['data' => [['id', 'penerima', 'pesan', 'status', 'triggered_by']]]]);
    }

    public function test_wa_log_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        WaLog::create(['depot_id' => $otherDepot->id, 'penerima' => '628111', 'pesan' => 'Other', 'status' => 'SENT', 'triggered_by' => 't']);
        WaLog::create(['depot_id' => $this->depot->id, 'penerima' => '628222', 'pesan' => 'Own', 'status' => 'SENT', 'triggered_by' => 't']);

        $res = $this->actingAs($this->kepala)->getJson('/api/admin/wa-log');

        $this->assertCount(1, $res->json('data.data'));
    }

    public function test_unauthenticated_cannot_access_wa_log(): void
    {
        $this->getJson('/api/admin/wa-log')->assertUnauthorized();
    }
}
