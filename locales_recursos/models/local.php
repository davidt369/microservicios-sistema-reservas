<?php
class Local {
    private $conn;
    private $table_name = "locales";

    public $id;
    public $nombre;
    public $direccion;
    public $telefono;
    public $tipo;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function read() {
        $query = "SELECT * FROM " . $this->table_name;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    public function create() {
        $query = "INSERT INTO " . $this->table_name . " SET nombre=:nombre, direccion=:direccion, telefono=:telefono, tipo=:tipo";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":nombre", $this->nombre);
        $stmt->bindParam(":direccion", $this->direccion);
        $stmt->bindParam(":telefono", $this->telefono);
        $stmt->bindParam(":tipo", $this->tipo);
        return $stmt->execute();
    }

    public function update() {
        $query = "UPDATE " . $this->table_name . " SET nombre=:nombre, direccion=:direccion, telefono=:telefono, tipo=:tipo WHERE id=:id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":nombre", $this->nombre);
        $stmt->bindParam(":direccion", $this->direccion);
        $stmt->bindParam(":telefono", $this->telefono);
        $stmt->bindParam(":tipo", $this->tipo);
        $stmt->bindParam(":id", $this->id);
        return $stmt->execute();
    }

    public function delete() {
        $query = "DELETE FROM " . $this->table_name . " WHERE id=:id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id);
        return $stmt->execute();
    }

    public function readOne() {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id=:id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id);
        $stmt->execute();
        return $stmt;
    }
}
?>