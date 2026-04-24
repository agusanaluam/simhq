<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogInteraksi extends Model
{

    protected $table = 'log_interaksi';

    protected $fillable = ['customer_id', 'tanggal', 'channel', 'isi', 'cs_id'];

    protected $casts = ['tanggal' => 'date'];

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function cs(): BelongsTo      { return $this->belongsTo(User::class, 'cs_id'); }
}
