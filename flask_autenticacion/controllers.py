# controllers.py
from werkzeug.security import generate_password_hash,check_password_hash
from models import insertar_usuario, obtener_todos_usuarios, obtener_usuario_por_correo, obtener_usuario_por_id, actualizar_usuario_db, eliminar_usuario_db

def validar_datos_usuario(data):
    if 'nombre' not in data or not data['nombre']:
        return False, 'El nombre es obligatorio'
    if 'correo' not in data or not data['correo']:
        return False, 'El correo es obligatorio'
    if 'contrasena' not in data or not data['contrasena']:
        return False, 'La contraseña es obligatoria'
    if 'rol' not in data or data['rol'] not in ['cliente', 'administrador']:
        return False, 'El rol debe ser cliente o administrador'
    return True, None

def crear_usuario(data):
    valido, mensaje = validar_datos_usuario(data)
    if not valido:
        return {'message': mensaje}, 400

    hashed_password = generate_password_hash(data['contrasena'], method='pbkdf2:sha256')
    insertar_usuario(data['nombre'], data['correo'], hashed_password, data.get('rol', 'cliente'))
    return {'message': 'Usuario creado exitosamente'}, 201

def obtener_usuarios():
    return obtener_todos_usuarios()

def obtener_usuario(id):
    usuario = obtener_usuario_por_id(id)
    if not usuario:
        return {'message': 'Usuario no encontrado'}, 404
    return usuario

def actualizar_usuario(id, data):
    usuario = obtener_usuario_por_id(id)
    if not usuario:
        return {'message': 'Usuario no encontrado'}, 404

    # Actualizar solo los campos proporcionados en data
    nombre = data.get('nombre', usuario['nombre'])
    correo = data.get('correo', usuario['correo'])
    contrasena = generate_password_hash(data['contrasena'], method='pbkdf2:sha256') if 'contrasena' in data else usuario['contrasena']
    rol = data.get('rol', usuario['rol'])
    activo = data.get('activo', usuario['activo'])

    actualizar_usuario_db(id, nombre, correo, contrasena, rol, activo)
    return {'message': 'Usuario actualizado exitosamente'}

def eliminar_usuario(id):
    usuario = obtener_usuario_por_id(id)
    if not usuario:
        return {'message': 'Usuario no encontrado'}, 404
    eliminar_usuario_db(id)
    return {'message': 'Usuario eliminado exitosamente'}

def login_usuario(data):
    correo = data.get('correo')
    contrasena = data.get('contrasena')
    usuario = obtener_usuario_por_correo(correo)
    if not usuario:
        return {'message': 'Usuario no encontrado'}, 404
    if not check_password_hash(usuario['contrasena'], contrasena):
        return {'message': 'Contraseña incorrecta'}, 401
    
    # Devolver los detalles del usuario
    usuario_data = {
        'id': usuario['id'],
        'nombre': usuario['nombre'],
        'correo': usuario['correo'],
        'rol': usuario['rol'],
        'activo': usuario['activo'],
        'fecha_creacion': usuario['fecha_creacion']
    }
    return usuario_data