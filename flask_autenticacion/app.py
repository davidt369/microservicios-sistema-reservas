# app.py
from flask import Flask
from routes import bp
from flask import Flask

app = Flask(__name__)
app.register_blueprint(bp)

if __name__ == '__main__':
    app.run(debug=True)
    
    
    
    
"""

{
    "nombre": "Juan Perez222",
    "correo": "juan.perez@example.com",
    "contrasena": "password123",
    "rol": "cliente",
    "activo": true
}
"""