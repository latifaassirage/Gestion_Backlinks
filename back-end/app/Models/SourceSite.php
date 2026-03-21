<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SourceSite extends Model
{
    use HasFactory;

    protected $fillable = ['domain', 'quality_score', 'dr', 'traffic_estimated', 'spam_score', 'notes'];

    public function backlinks()
    {
        return $this->hasMany(Backlink::class);
    }
}
