# routes.py
from flask import Blueprint, request, jsonify
import controllers

bp = Blueprint('usuarios', __name__)

@bp.route('/usuarios', methods=['POST'])
def crear_usuario():
    data = request.get_json()
    return jsonify(controllers.crear_usuario(data))

@bp.route('/usuarios', methods=['GET'])
def obtener_usuarios():
    return jsonify(controllers.obtener_usuarios())

@bp.route('/usuarios/<int:id>', methods=['GET'])
def obtener_usuario(id):
    return jsonify(controllers.obtener_usuario(id))

@bp.route('/usuarios/<int:id>', methods=['PATCH'])
def actualizar_usuario(id):
    data = request.get_json()
    return jsonify(controllers.actualizar_usuario(id, data))

@bp.route('/usuarios/<int:id>', methods=['DELETE'])
def eliminar_usuario(id):
    return jsonify(controllers.eliminar_usuario(id))


@bp.route('/login', methods=['POST'])
def login_usuario():
    data = request.get_json()
    return jsonify(controllers.login_usuario(data))

