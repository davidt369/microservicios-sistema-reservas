<?php
include_once '../models/db.php';
include_once '../controllers/LocalController.php';

$database = new Database();
$db = $database->getConnection();

$localController = new LocalController($db);
$request_method = $_SERVER["REQUEST_METHOD"];

switch($request_method) {
    case 'GET':
        if(isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $localController->getLocal($id);
        } else {
            $localController->getLocales();
        }
        break;
    
    case 'POST':
        $data = json_decode(file_get_contents("php://input"));
        $localController->createLocal($data);
        break;

    case 'PUT':
        if(isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $data = json_decode(file_get_contents("php://input"));
            $localController->updateLocal($id, $data);
        } else {
            header("HTTP/1.0 400 Bad Request");
            echo json_encode(array("message" => "ID is required"));
        }
        break;

    case 'DELETE':
        if(isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $localController->deleteLocal($id);
        } else {
            header("HTTP/1.0 400 Bad Request");
            echo json_encode(array("message" => "ID is required"));
        }
        break;

    default:
        header("HTTP/1.0 405 Method Not Allowed");
        break;
}
?>