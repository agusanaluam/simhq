<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; }
  .label {
    width: 141.73pt; height: 85.04pt;
    border: 1px solid #ccc; padding: 6pt;
    display: flex; align-items: center; gap: 6pt;
    page-break-after: always;
  }
  .qr img { width: 60pt; height: 60pt; }
  .info { flex: 1; }
  .no-hewan { font-size: 20pt; font-weight: bold; line-height: 1; }
  .detail { font-size: 8pt; color: #555; margin-top: 4pt; }
  .depot { font-size: 7pt; color: #888; margin-top: 2pt; }
</style>
</head>
<body>
@foreach($hewan as $h)
<div class="label">
  <div class="qr"><img src="data:image/png;base64,{{ $h['qr_b64'] }}" alt="QR"></div>
  <div class="info">
    <div class="no-hewan">{{ $h['no_hewan'] }}</div>
    <div class="detail">{{ $h['jenis'] }} · Kelas {{ $h['kelas_jual']['kode'] ?? '—' }}</div>
    <div class="depot">{{ $h['depot']['nama'] ?? '' }} · {{ $h['musim'] }}</div>
  </div>
</div>
@endforeach
</body>
</html>
