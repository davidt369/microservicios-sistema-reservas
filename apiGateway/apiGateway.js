const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const port = 3000;

// Habilitar CORS para permitir el acceso desde cualquier origen
app.use(cors());

// Configuración de servicios
const services = {
  userService: 'http://localhost:5000',  // Servicio de autenticación (Flask)
  localService: 'http://localhost/sistema-reservas/locales_recursos/routes/locales.php', // Servicio de locales (PHP)
  recursoService: 'http://localhost/sistema-reservas/locales_recursos/routes/recursos.php',  // Servicio de recursos (PHP)
  reservaService: 'http://localhost:3001/api/reservas', // Servicio de reservas (Node.js)
  disponibilidadService: 'http://localhost:3002/api/disponibilidad', // Servicio de disponibilidad (Node.js)
  authService: 'http://localhost:5001'  // Servicio de autenticación (Flask)
};

// Proxy para servicio de autenticación
app.use('/servicio-auth', createProxyMiddleware({
  target: services.authService,
  changeOrigin: true,
  pathRewrite: { '^/servicio-auth': '' },
}));

// Proxy para servicio de usuarios
app.use('/servicio-usuarios', createProxyMiddleware({
  target: services.userService,
  changeOrigin: true,
  pathRewrite: { '^/servicio-usuarios': '' },
}));

// Proxy para servicio de locales (PHP)
app.use('/servicio/locales', createProxyMiddleware({
  target: services.localService,
  changeOrigin: true,
  pathRewrite: { '^/servicio/locales': '' },
}));

// Proxy para servicio de recursos (PHP)
app.use('/servicio/recursos', createProxyMiddleware({
  target: services.recursoService,
  changeOrigin: true,
  pathRewrite: { '^/servicio/recursos': '/recursos.php' },
}));

// Proxy para servicio de reservas (Node.js)
app.use('/servicio/reservas', createProxyMiddleware({
  target: services.reservaService,
  changeOrigin: true,
  pathRewrite: { '^/servicio/reservas': '' },
}));

// Proxy para servicio de disponibilidad (Node.js)
app.use('/servicio/disponibilidad', createProxyMiddleware({
  target: services.disponibilidadService,
  changeOrigin: true,
  pathRewrite: { '^/servicio/disponibilidad': '' },
}));

app.listen(port, () => {
  console.log(`API Gateway escuchando en http://localhost:${port}`);
});
