<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    use HasFactory;

    protected $fillable = ['company_name', 'contact_email', 'website', 'city', 'state', 'notes'];

    public function backlinks()
    {
        return $this->hasMany(Backlink::class);
    }
}
