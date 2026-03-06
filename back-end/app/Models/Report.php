<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasFactory;

    protected $fillable = ['type', 'title', 'description', 'data', 'file_path', 'generated_by', 'generated_at'];

    public function generator()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
