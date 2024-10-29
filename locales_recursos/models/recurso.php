<?php
class Recurso {
    private $conn;
    private $table_name = "recursos";

    public $id;
    public $local_id;
    public $tipo_recurso;
    public $capacidad;
    public $estado;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function readAll() {
        $query = "SELECT * FROM " . $this->table_name;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    public function readByLocal($local_id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE local_id = :local_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":local_id", $local_id);
        $stmt->execute();
        return $stmt;
    }

    public function read($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        return $stmt;
    }

    public function create() {
        $query = "INSERT INTO " . $this->table_name . " SET local_id=:local_id, tipo_recurso=:tipo_recurso, capacidad=:capacidad, estado=:estado";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":local_id", $this->local_id);
        $stmt->bindParam(":tipo_recurso", $this->tipo_recurso);
        $stmt->bindParam(":capacidad", $this->capacidad);
        $stmt->bindParam(":estado", $this->estado);
        return $stmt->execute();
    }

    public function update() {
        $query = "UPDATE " . $this->table_name . " SET local_id=:local_id, tipo_recurso=:tipo_recurso, capacidad=:capacidad, estado=:estado WHERE id=:id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":local_id", $this->local_id);
        $stmt->bindParam(":tipo_recurso", $this->tipo_recurso);
        $stmt->bindParam(":capacidad", $this->capacidad);
        $stmt->bindParam(":estado", $this->estado);
        $stmt->bindParam(":id", $this->id);
        return $stmt->execute();
    }

    public function delete() {
        $query = "DELETE FROM " . $this->table_name . " WHERE id=:id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id);
        return $stmt->execute();
    }
}
?>