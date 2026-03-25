<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - Backlinks Management</title>
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="stylesheet" href="<?php echo e(asset('css/login.css')); ?>">
</head>
<body>
    <div id="root"></div>
    <!-- Configuration globale pour React -->
    <script>
        window.APP_CONFIG = {
            logoUrl: '/favicon.ico',
            baseUrl: '<?php echo e(url('/')); ?>'
        };
        console.log('APP_CONFIG initialisé:', window.APP_CONFIG);
    </script>
    <!-- React Development Files -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <!-- Local React Router DOM -->
    <script src="<?php echo e(asset('js/react-router-dom.min.js')); ?>"></script>
    <!-- API pour les appels backend -->
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
    <script type="text/babel" src="<?php echo e(asset('js/reset-password.js')); ?>"></script>
</body>
</html>
<?php /**PATH C:\gestion-backlinks\back-end\resources\views/app.blade.php ENDPATH**/ ?>