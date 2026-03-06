<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Backlink extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id', 'source_site_id', 'type', 'target_url', 'anchor_text',
        'placement_url', 'date_added', 'status', 'cost'
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function sourceSite()
    {
        return $this->belongsTo(SourceSite::class);
    }
}
