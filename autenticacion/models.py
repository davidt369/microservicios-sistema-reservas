# models.py

from db import get_db
from werkzeug.security import generate_password_hash

def create_user(nombre, correo, contrasena, rol='cliente'):
    hashed_password = generate_password_hash(contrasena)
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO usuarios (nombre, correo, contrasena, rol, activo, fecha_creacion)
        VALUES (%s, %s, %s, %s, TRUE, NOW())
    """, (nombre, correo, hashed_password, rol))
    db.commit()
    return cursor.lastrowid

def get_user_by_email(correo):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM usuarios WHERE correo = %s", (correo,))
    return cursor.fetchone()
