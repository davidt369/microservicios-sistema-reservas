# app.py

from flask import Flask
from flask_jwt_extended import JWTManager
from config import Config
from routes import auth_bp
from db import close_db

app = Flask(__name__)
app.config.from_object(Config)

# Inicializar JWT
jwt = JWTManager(app)

# Registrar el Blueprint de autenticación
app.register_blueprint(auth_bp, url_prefix='/api/auth')

# Cerrar la conexión a la base de datos al finalizar la solicitud
@app.teardown_appcontext
def teardown_db(exception):
    close_db(exception)

if __name__ == "__main__":
    app.run(debug=True, port=5001)
