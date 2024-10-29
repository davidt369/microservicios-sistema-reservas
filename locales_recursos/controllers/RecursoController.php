<?php
include_once '../models/recurso.php';

class RecursoController {
    private $db;
    private $recurso;

    public function __construct($db) {
        $this->db = $db;
        $this->recurso = new Recurso($db);
    }

    public function getAllRecursos() {
        $stmt = $this->recurso->readAll();
        $recursos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($recursos);
    }

    public function getRecursosByLocal($local_id) {
        $stmt = $this->recurso->readByLocal($local_id);
        $recursos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($recursos);
    }

    public function getRecurso($id) {
        $stmt = $this->recurso->read($id);
        $recurso = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($recurso);
    }

    public function createRecurso($data) {
        $this->recurso->local_id = $data->local_id;
        $this->recurso->tipo_recurso = $data->tipo_recurso;
        $this->recurso->capacidad = $data->capacidad;
        $this->recurso->estado = "disponible"; // Estado por defecto
        
        if ($this->recurso->create()) {
            http_response_code(201);
            echo json_encode(array("message" => "Recurso creado con éxito."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "No se pudo crear el recurso."));
        }
    }

    public function updateRecurso($id, $data) {
        $this->recurso->id = $id;
        $this->recurso->local_id = $data->local_id;
        $this->recurso->tipo_recurso = $data->tipo_recurso;
        $this->recurso->capacidad = $data->capacidad;
        $this->recurso->estado = $data->estado;
        
        if ($this->recurso->update()) {
            http_response_code(200);
            echo json_encode(array("message" => "Recurso actualizado con éxito."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "No se pudo actualizar el recurso."));
        }
    }

    public function deleteRecurso($id) {
        $this->recurso->id = $id;

        if ($this->recurso->delete()) {
            echo json_encode(array("message" => "Recurso eliminado exitosamente."));
        } else {
            echo json_encode(array("message" => "Error al eliminar el recurso."));
        }
    }
}
?>