<?php
include_once '../models/db.php';
include_once '../controllers/RecursoController.php'; // Asegúrate de que esta ruta sea correcta

$database = new Database();
$db = $database->getConnection();

$recursoController = new RecursoController($db);
$request_method = $_SERVER["REQUEST_METHOD"];

switch($request_method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $recursoController->getRecurso($id);
        } elseif (isset($_GET['local_id'])) {
            $local_id = intval($_GET['local_id']);
            $recursoController->getRecursosByLocal($local_id);
        } else {
            $recursoController->getAllRecursos();
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->local_id) && !empty($data->tipo_recurso) && !empty($data->capacidad)) {
            $recursoController->createRecurso($data);
        } else {
            http_response_code(400);
            echo json_encode(array("message" => "No se pueden crear recursos. Datos incompletos."));
        }
        break;

    case 'PUT':
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $data = json_decode(file_get_contents("php://input"));
            $recursoController->updateRecurso($id, $data);
        } else {
            http_response_code(400);
            echo json_encode(array("message" => "No se puede actualizar el recurso. ID no proporcionado."));
        }
        break;

    case 'DELETE':
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $recursoController->deleteRecurso($id);
        } else {
            http_response_code(400);
            echo json_encode(array("message" => "No se puede eliminar el recurso. ID no proporcionado."));
        }
        break;

    default:
        header("HTTP/1.0 405 Method Not Allowed");
        break;
}
?>