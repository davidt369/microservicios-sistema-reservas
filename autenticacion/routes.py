# routes.py

from flask import Blueprint, request
from controller import register_user, login_user, get_current_user, logout_user

auth_bp = Blueprint('auth', __name__)

# Ruta para registrar un usuario
@auth_bp.route('/register', methods=['POST'])
def register_route():
    data = request.json
    return register_user(data)

# Ruta para iniciar sesión
@auth_bp.route('/login', methods=['POST'])
def login_route():
    data = request.json
    return login_user(data)

# Ruta para obtener el usuario autenticado
@auth_bp.route('/me', methods=['GET'])
def me_route():
    return get_current_user()

# Ruta para cerrar sesión
@auth_bp.route('/logout', methods=['GET'])
def logout_route():
    return logout_user()
