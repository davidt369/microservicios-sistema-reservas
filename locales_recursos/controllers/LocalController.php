<?php
include_once '../models/local.php';

class LocalController {
    private $db;
    private $local;

    public function __construct($db) {
        $this->db = $db;
        $this->local = new Local($db);
    }

    // Obtener todos los locales
    public function getLocales() {
        $stmt = $this->local->read();
        $locales = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($locales);
    }

    // Crear un nuevo local
    public function createLocal($data) {
        $this->local->nombre = $data->nombre;
        $this->local->direccion = $data->direccion;
        $this->local->telefono = $data->telefono;
        $this->local->tipo = $data->tipo;

        if ($this->local->create()) {
            echo json_encode(array("message" => "Local creado exitosamente."));
        } else {
            echo json_encode(array("message" => "Error al crear el local."));
        }
    }

    // Actualizar un local
    public function updateLocal($id, $data) {
        $this->local->id = $id;
        $this->local->nombre = $data->nombre;
        $this->local->direccion = $data->direccion;
        $this->local->telefono = $data->telefono;
        $this->local->tipo = $data->tipo;

        if ($this->local->update()) {
            echo json_encode(array("message" => "Local actualizado exitosamente."));
        } else {
            echo json_encode(array("message" => "Error al actualizar el local."));
        }
    }

    // Eliminar un local
    public function deleteLocal($id) {
        $this->local->id = $id;

        if ($this->local->delete()) {
            echo json_encode(array("message" => "Local eliminado exitosamente."));
        } else {
            echo json_encode(array("message" => "Error al eliminar el local."));
        }
    }

    // Obtener un local por id
    public function getLocal($id) {
        $this->local->id = $id;
        $stmt = $this->local->readOne();
        $local = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($local);
    }
}
?>