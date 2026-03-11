<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rapport Backlinks</title>
    <style>
        body { font-family: sans-serif; font-size: 10px; color: #333; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #444; padding: 20px; background-color: #f9f9f9; }
        .header h1 { margin: 0; color: #2c3e50; font-size: 22px; }
        .header p { margin: 5px 0; color: #7f8c8d; }
        
        
        .stats-container { width: 100%; margin-bottom: 20px; text-align: center; }
        .stat-box { display: inline-block; width: 18%; padding: 10px; background: #fff; border: 1px solid #eee; margin: 0 5px; }
        .stat-box h4 { margin: 0; color: #7f8c8d; font-size: 9px; text-transform: uppercase; }
        .stat-box p { margin: 5px 0 0; font-size: 14px; font-weight: bold; color: #2c3e50; }

        table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; word-wrap: break-word; }
        th { background-color: #2c3e50; color: white; font-weight: bold; text-transform: uppercase; font-size: 9px; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        
        .status-live { color: #27ae60; font-weight: bold; }
        .status-lost { color: #e74c3c; font-weight: bold; }
        .url-text { font-size: 8px; color: #2980b9; }
        
        .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 9px; color: #999; padding: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>RAPPORT DE BACKLINKS</h1>
        <p>Généré le : {{ date('d/m/Y H:i') }}</p>
        @if(isset($startDate) && isset($endDate) && $startDate && $endDate)
            <p><strong>Période :</strong> Du {{ $startDate }} au {{ $endDate }}</p>
        @else
            <p><strong>Période :</strong> Rapport Global</p>
        @endif
    </div>

    <div class="stats-container">
        <div class="stat-box"><h4>Total</h4><p>{{ $stats['total'] }}</p></div>
        <div class="stat-box"><h4>Live</h4><p>{{ $stats['live'] }}</p></div>
        <div class="stat-box"><h4>Lost</h4><p>{{ $stats['lost'] }}</p></div>
        <div class="stat-box"><h4>Paid</h4><p>{{ $stats['paid'] }}</p></div>
        <div class="stat-box"><h4>Coût Total</h4><p>${{ number_format($stats['total_cost'], 2) }}</p></div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 12%;">Date</th>
                <th style="width: 15%;">Source</th>
                <th style="width: 10%;">Score</th>
                <th style="width: 15%;">Anchor</th>
                <th style="width: 20%;">Target URL</th>
                <th style="width: 10%;">Status</th>
                <th style="width: 10%;">Coût</th>
            </tr>
        </thead>
        <tbody>
            @foreach($backlinks as $link)
            <tr>
                <td>{{ $link->date_added }}</td>
                <td><strong>{{ $link->sourceSite->domain ?? 'N/A' }}</strong></td>
                <td style="text-align: center;">{{ $link->sourceSite->quality_score ?? '3' }} /5</td>
                <td>{{ $link->anchor_text ?? '-' }}</td>
                <td class="url-text">{{ $link->target_url }}</td>
                <td class="status-{{ strtolower($link->status) }}">{{ $link->status }}</td>
                <td>${{ number_format($link->cost, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        Gestion Backlinks - Rapport Confidentiel - Page {PAGENO}
    </div>
</body>
</html>