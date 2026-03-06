<?php
require_once __DIR__ . '/back-end/vendor/autoload.php';
$app = require_once __DIR__ . '/back-end/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$staff = User::where('email', 'staff@agency.com')->first();
if ($staff && Hash::check('Staff123!', $staff->password)) {
    echo " Staff password OK\n";
} else {
    echo " Staff password problem\n";
}

$admin = User::where('email', 'admin@agency.com')->first();
if ($admin && Hash::check('Admin123!', $admin->password)) {
    echo " Admin password OK\n";
} else {
    echo " Admin password problem\n";
}
