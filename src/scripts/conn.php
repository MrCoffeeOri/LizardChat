<?php
    $conn = new PDO("mysql:host=localhost;port=3306;dbname=museu", "root", "", array(PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION)); 
    if (!$conn) echo "Conexão mal sucedida!"
?>