<?php
namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\KelasHewan;
use Illuminate\Http\JsonResponse;

class KelasController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => KelasHewan::orderBy('urutan')->get()]);
    }
}
