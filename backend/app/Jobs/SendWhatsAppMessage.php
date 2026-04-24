<?php

namespace App\Jobs;

use App\Models\WaLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

class SendWhatsAppMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(private readonly int $logId) {}

    public function handle(): void
    {
        $log = WaLog::find($this->logId);
        if (!$log) return;

        $url     = config('services.waha.url') . '/api/sendText';
        $session = config('services.waha.session', 'default');
        $chatId  = $log->penerima . '@c.us';

        try {
            $response = Http::timeout(10)->post($url, [
                'session' => $session,
                'chatId'  => $chatId,
                'text'    => $log->pesan,
            ]);

            $log->update([
                'status'        => $response->successful() ? 'SENT' : 'FAILED',
                'error_message' => $response->successful() ? null : $response->body(),
            ]);
        } catch (\Exception $e) {
            $log->update(['status' => 'FAILED', 'error_message' => $e->getMessage()]);
        }
    }

    public function failed(\Throwable $e): void
    {
        WaLog::where('id', $this->logId)->update([
            'status'        => 'FAILED',
            'error_message' => $e->getMessage(),
        ]);
    }
}
