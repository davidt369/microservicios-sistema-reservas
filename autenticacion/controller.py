# controller.py

from models import create_user, get_user_by_email
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from flask import jsonify
from werkzeug.security import check_password_hash
import re

# Validación de datos de registro
def validate_registration_data(data):
    nombre = data.get('nombre')
    correo = data.get('correo')
    contrasena = data.get('contrasena')

    if not nombre or not correo or not contrasena:
        return "Todos los campos son requeridos", False

    if not re.match(r"[^@]+@[^@]+\.[^@]+", correo):
        return "Formato de correo inválido", False

    if len(contrasena) < 6:
        return "La contraseña debe tener al menos 6 caracteres", False

    return "", True

# Registro de usuarios
def register_user(data):
    error_msg, is_valid = validate_registration_data(data)
    if not is_valid:
        return jsonify({"msg": error_msg}), 400

    nombre = data['nombre']
    correo = data['correo']
    contrasena = data['contrasena']
    rol = data.get('rol', 'cliente')

    if get_user_by_email(correo):
        return jsonify({"msg": "El correo ya está registrado"}), 400

    user_id = create_user(nombre, correo, contrasena, rol)
    return jsonify({"msg": "Usuario registrado exitosamente", "user_id": user_id}), 201

# Inicio de sesión
def login_user(data):
    correo = data.get('correo')
    contrasena = data.get('contrasena')

    user = get_user_by_email(correo)
    if user and check_password_hash(user[3], contrasena):
        if not user[5]:
            return jsonify({"msg": "Usuario inactivo"}), 403

        access_token = create_access_token(identity=user[0], additional_claims={"rol": user[4]})
        refresh_token = create_refresh_token(identity=user[0])
        
        return jsonify(access_token=access_token, refresh_token=refresh_token), 200

    return jsonify({"msg": "Credenciales incorrectas"}), 401

# Obtener el usuario autenticado
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = get_user_by_email(user_id)
    if user:
        return jsonify({
            "id": user[0],
            "nombre": user[1],
            "correo": user[2],
            "rol": user[4],
            "activo": user[5]
        }), 200
    return jsonify({"msg": "Usuario no encontrado"}), 404

# Cerrar sesión
def logout_user():
    return jsonify({"msg": "Sesión cerrada exitosamente"}), 200
