<?php

namespace App\Http\Controllers;

use App\Models\Backlink;
use App\Models\Client;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class ReportController extends Controller
{
    public function generatePdf(Request $request, $clientId = null)
    {
        try {
            $query = Backlink::with(['sourceSite', 'client']);
            
            if ($clientId && $clientId !== 'null') {
                $query->where('client_id', $clientId);
            }
            
            if ($request->start_date) {
                $query->whereDate('date_added', '>=', $request->start_date);
            }
            if ($request->end_date) {
                $query->whereDate('date_added', '<=', $request->end_date);
            }
            
            $backlinks = $query->get();
            
            $stats = [
                'total' => $backlinks->count(),
                'live' => $backlinks->where('status', 'Live')->count(),
                'lost' => $backlinks->where('status', 'Lost')->count(),
                'pending' => $backlinks->where('status', 'Pending')->count(),
                'free' => $backlinks->where('cost', 0)->count(),
                'paid' => $backlinks->where('cost', '>', 0)->count(),
                'total_cost' => (float) $backlinks->sum('cost')
            ];

            $pdf = Pdf::loadView('reports.pdf', compact('backlinks', 'stats'));
            return $pdf->download('rapport.pdf');

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function generateExcel(Request $request, $clientId = null)
    {
        try {
            $query = Backlink::with(['sourceSite', 'client']);
            if ($clientId && $clientId !== 'null') {
                $query->where('client_id', $clientId);
            }
            $backlinks = $query->get();

            $fileName = 'backlinks_report.csv';
            $headers = [
                "Content-type" => "text/csv; charset=UTF-8",
                "Content-Disposition" => "attachment; filename=$fileName",
            ];

            $callback = function() use($backlinks) {
                $file = fopen('php://output', 'w');
                fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF)); 
                
                fputcsv($file, ['Date', 'Site Source', 'Score', 'Client', 'Type', 'Target URL', 'Anchor', 'Status', 'Cost']);

                foreach ($backlinks as $link) {
                    fputcsv($file, [
                        $link->date_added,
                        $link->sourceSite->url ?? $link->sourceSite->domain ?? 'N/A',
                        $link->sourceSite->quality_score ?? 'N/A',
                        $link->client->company_name ?? 'N/A',
                        $link->type,
                        $link->target_url,
                        $link->anchor_text,
                        $link->status,
                        $link->cost
                    ]);
                }
                fclose($file);
            };

            return response()->stream($callback, 200, $headers);

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}