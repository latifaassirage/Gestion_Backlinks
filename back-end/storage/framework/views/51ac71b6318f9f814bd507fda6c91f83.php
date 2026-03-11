<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rapport Backlinks</title>
    <style>
        body { font-family: sans-serif; font-size: 11px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 9px; color: #999; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Rapport de Backlinks</h1>
        <p>Généré le : <?php echo e(date('d/m/Y H:i')); ?></p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Type</th>
                <th>Status</th>
                <th>Coût</th>
            </tr>
        </thead>
        <tbody>
            <?php $__currentLoopData = $backlinks; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $link): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <tr>
                <td><?php echo e($link->date_added); ?></td>
                <td><?php echo e($link->sourceSite->domain ?? 'N/A'); ?></td>
                <td><?php echo e($link->type); ?></td>
                <td><?php echo e($link->status); ?></td>
                <td>$<?php echo e(number_format($link->cost, 2)); ?></td>
            </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </tbody>
    </table>

    <div class="footer">
        Gestion Backlinks - Rapport Automatique
    </div>
</body>
</html><?php /**PATH C:\gestion-backlinks\back-end\resources\views/reports/pdf.blade.php ENDPATH**/ ?>