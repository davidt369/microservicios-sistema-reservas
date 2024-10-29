from db import obtener_conexion



def insertar_usuario(nombre, correo, contrasena, rol):
    conexion = obtener_conexion()
    cursor = conexion.cursor()
    cursor.execute(
        "INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES (%s, %s, %s, %s)",
        (nombre, correo, contrasena, rol)
    )
    conexion.commit()
    cursor.close()
    conexion.close()

def obtener_todos_usuarios():
    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("SELECT * FROM usuarios")
    usuarios = cursor.fetchall()
    cursor.close()
    conexion.close()
    return usuarios

def obtener_usuario_por_id(id):
    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("SELECT * FROM usuarios WHERE id = %s", (id,))
    usuario = cursor.fetchone()
    cursor.close()
    conexion.close()
    return usuario

def actualizar_usuario_db(id, nombre, correo, contrasena, rol, activo):
    conexion = obtener_conexion()
    cursor = conexion.cursor()
    cursor.execute(
        "UPDATE usuarios SET nombre = %s, correo = %s, contrasena = %s, rol = %s, activo = %s WHERE id = %s",
        (nombre, correo, contrasena, rol, activo, id)
    )
    conexion.commit()
    cursor.close()
    conexion.close()

def eliminar_usuario_db(id):
    conexion = obtener_conexion()
    cursor = conexion.cursor()
    cursor.execute("DELETE FROM usuarios WHERE id = %s", (id,))
    conexion.commit()
    cursor.close()
    conexion.close()
    


def obtener_usuario_por_correo(correo):
    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("SELECT * FROM usuarios WHERE correo = %s", (correo,))
    usuario = cursor.fetchone()
    cursor.close()
    conexion.close()
    return usuario

