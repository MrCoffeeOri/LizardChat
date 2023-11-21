<?php
    include "../scripts/commentStructure.php";
    include "./conn.php";
    
    $conn->query(
        $_POST['action'] == "add" ? 
        "INSERT INTO `comentarios`(`id`, `userID`, `texto`, `dataP`) VALUES (DEFAULT,'".$_POST['userID']."','".$_POST['texto']."', DEFAULT)" 
        : ($_POST['action'] == "delete" ?
        "DELETE FROM `comentarios` WHERE id = ".$_POST['id'].";"
        : ($_POST['action'] == "update" 
        ? "UPDATE `comentarios` SET `texto` = '".$_POST['texto']."' WHERE id = ".$_POST['id'].";" 
        : ($_POST['isADM'] ? 
        "SELECT c.id, c.userID, c.texto, c.dataP, u.nick FROM `comentarios` c INNER JOIN `usuarios` u ON c.userID = u.id LIMIT 20;" 
        : "SELECT * FROM `comentarios` WHERE userID = '".$_SESSION['id']."' ORDER BY `dataP`;")))
    );
    echo $_POST['action'] == "add" ? Comment($conn->query("SELECT * FROM `comentarios` WHERE id = ".$conn->lastInsertId()." AND userID = ".$_POST['userID'].";")->fetch()) : $_POST['id'];
?>