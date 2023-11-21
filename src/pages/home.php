<!DOCTYPE html>
<html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="../css/home.css">
        <link rel="icon" type="image/png" href="../img/icons/icon-museu-pap.webp"/>
        <script src="../scripts/home.js" defer></script>
        <title>Home - Usuário</title>
    </head>
    <body>
        <?php
            include '../scripts/conn.php';
            include "../scripts/commentStructure.php";

            session_start();
            
            if (isset($_POST['atua'])) {
                if (isset($_FILES['novaFoto']) && $_SESSION['foto'] != $_FILES['novaFoto']['name']) {
                    if (!unlink("../uploads/".$_SESSION['foto']))
                        return die("Falha ao atualizar a imagem!");
                    if (!move_uploaded_file($_FILES['novaFoto']['tmp_name'], "../uploads/".$_FILES['novaFoto']['name']))
                        return die("Falha no envio!");
                    $_SESSION['foto'] = $_FILES['novaFoto']['name'];
                    $_FILES['novaFoto'] = null;
                }
                if (!$conn->query("UPDATE `usuarios` SET `nome` = '".$_POST['nome']."', `nick` = '".$_POST['nick']."', `email` = '".$_POST['email']."', `senha` = '".$_POST['senha']."', `telefone` = '".$_POST['telefone']."', `cidade` = '".$_POST['cidade']."' ".(isset($_FILES['novaFoto']) ? ", `foto` = '".$_FILES['novaFoto']['name']."'" : "")." WHERE `email` = '".$_SESSION['email']."' AND `senha` = '".$_SESSION['senha']."';")) die("Atualização fracassada!");
                $_SESSION['nome'] = $_POST['nome'];
                $_SESSION['nick'] = $_POST['nick'];
                $_SESSION['email'] = $_POST['email'];
                $_SESSION['senha'] = $_POST['senha'];
                $_SESSION['telefone'] = $_POST['telefone'];
                $_SESSION['cidade'] = $_POST['cidade'];
            } 
            elseif (isset($_POST['login']))
                Login($conn, $_POST['email'], $_POST['senha']);
            elseif (isset($_POST['logon'])) {
                $email = $_POST['email']; 
                $senha = $_POST['senha'];
                $nick = $_POST['nick'];
                $telefone = $_POST['telefone'];
                $cidade = $_POST['cidade'];
                $foto = $_FILES['fotoUser'];
                $dtCriac = date("d-m-Y");
                $sqlRes = $conn->query("INSERT INTO `usuarios` (`id`, `nome`, `nick`, `email`, `senha`, `telefone`, `cidade`, `foto`, `data_cadastro`) VALUES (DEFAULT, '".$_SESSION['nome']."','$nick','$email','$senha','$telefone','$cidade','".$foto['name']."', DEFAULT);");
                if (!move_uploaded_file($foto['tmp_name'], "../uploads/".$foto['name']))
                    return die("Falha no envio");
                echo "<script defer>alert('Conta criada com sucesso!')</script>";
                Login($conn, $email, $senha);
            }

            function Login(PDO $conn, string $email, string $senha) : void {
                $sqlRes = $conn->query("SELECT * FROM `usuarios` WHERE `email` = '$email' AND `senha` = '$senha';")->fetch();
                if (!$sqlRes) {
                    unset($_SESSION['email'], $_SESSION['senha']);
                    $_SESSION['erro'] = "Falha na autenticação!";
                    header("location:../index.php");
                }
                echo "<script defer>localStorage.setItem('userID', ".$sqlRes['id'].")</script>";
                $_SESSION['id'] = $sqlRes['id'];
                $_SESSION['foto'] = $sqlRes['foto'];
                $_SESSION['nome'] = $sqlRes['nome'];
                $_SESSION['nick'] = $sqlRes['nick'];
                $_SESSION['email'] = $sqlRes['email'];
                $_SESSION['senha'] = $sqlRes['senha'];
                $_SESSION['telefone'] = $sqlRes['telefone'];
                $_SESSION['cidade'] = $sqlRes['cidade'];
                $_SESSION['tipo'] = $sqlRes['tipo'];
                $_SESSION['data_cadastro'] = $sqlRes['data_cadastro'];
            }

            function DeleteUser(mysqli $conexao) : mysqli_result { // Função para o administrador deletar usuários
                return mysqli_query($conexao,
                    "
                        DELETE FROM `usuarios` WHERE `id`='".$_POST['id']."'; 
                        INSERT INTO `logs` (`acao`, `por`) VALUES ('deletar usuário', ".$_SESSION['id'].");'
                    "
                );
            }
        ?>
        <nav>
            <div class='container'>
                <div id='menu'>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
                <div id='info' style="display: flex;align-items: center;justify-content: flex-start;">
                    <img style="margin: 0 4% 0 2%;width: 7%;" src='../img/icons/lupa.png' alt=''>
                    <input type="text" value="Obra Dobradim">
                </div>
                <div id='menu-selection'>
                    <h2 idM='perfil'>Perfil</h2>
                    <h2 idM='coment'>Meus comentários</h2>
                    <?php 
                        if ($_SESSION['tipo'] == 'A') echo "
                            <h2 idM='gComent'>Gerenciar Comentários</h2>
                            <h2 idM='gPerfils'>Gerenciar Usuários</h2>
                            <h2 idM='gObras'>Gerenciar Obras</h2>
                            <h2 idM='gReports'> Gerenciar Reports </h2>
                        ";
                    ?>
                    <h2 idM='sair'>Sair</h2>
                </div>
            </div>
            <h2>Olá <?php if ($_SESSION['tipo'] == 'A') echo "Administrador";?>, <?php echo $_SESSION['nome']?></h2>
            <img style="border-radius: 50%;margin-right: 12px;width: 65px;height: 65px;" src=<?php echo '../uploads/'.$_SESSION['foto']?> alt=''>
        </nav>
        <main>
            <section>
                <h2>Melhores obras</h2>
                <div class="slider-container" currentSlideIndex="0">
                    <div class="slider">
                        <div class="slide">
                            <div class="slide-content">
                                <img src="../img/img-slider/imagem-1.webp" alt="Imagem 1">
                                <div class="slide-subcontent">
                                    <h1>Faz o incrível</h1>
                                    <p style="width: 100%">Lorem, ipsum dolor sit amet consectetur adipisicing elit. Neque quae, facilis illo officiis debitis consequatur laborum quasi, velit at, praesentium perspiciatis blanditiis ab ea eligendi culpa saepe dolor! Voluptatem, illum!</p>
                                </div>
                            </div>
                        </div>
                        <div class="slide">
                            <div class="slide-content">
                                <img src="../img/img-slider/imagem-2.webp" alt="Imagem 2">
                                <div class="slide-subcontent">
                                    <h1>Faz o incrível</h1>
                                    <p style="width: 100%">Lorem, ipsum dolor sit amet consectetur adipisicing elit. Neque quae, facilis illo officiis debitis consequatur laborum quasi, velit at, praesentium perspiciatis blanditiis ab ea eligendi culpa saepe dolor! Voluptatem, illum!</p>
                                </div>
                            </div>
                        </div>
                        <div class="slide">
                            <div class="slide-content">
                                <img src="../img/img-slider/imagem-3.webp" alt="Imagem 3">
                                <div class="slide-subcontent">
                                    <h1>Faz o incrível</h1>
                                    <p style="width: 100%">Lorem, ipsum dolor sit amet consectetur adipisicing elit. Neque quae, facilis illo officiis debitis consequatur laborum quasi, velit at, praesentium perspiciatis blanditiis ab ea eligendi culpa saepe dolor! Voluptatem, illum!</p>
                                </div>
                            </div>
                        </div>
                        <div class="slide">
                            <div class="slide-content">
                                <img src="../img/img-slider/imagem-4.webp" alt="Imagem 3">
                                <div class="slide-subcontent">
                                    <h1>Faz o incrível</h1>
                                    <p style="width: 100%">Lorem, ipsum dolor sit amet consectetur adipisicing elit. Neque quae, facilis illo officiis debitis consequatur laborum quasi, velit at, praesentium perspiciatis blanditiis ab ea eligendi culpa saepe dolor! Voluptatem, illum!</p>
                                </div>
                            </div>
                        </div>
                        <div class="slide">
                            <div class="slide-content">
                                <img src="../img/img-slider/imagem-5.webp" alt="Imagem 3">
                                <div class="slide-subcontent">
                                    <h1>Faz o incrível</h1>
                                    <p style="width: 100%">Lorem, ipsum dolor sit amet consectetur adipisicing elit. Neque quae, facilis illo officiis debitis consequatur laborum quasi, velit at, praesentium perspiciatis blanditiis ab ea eligendi culpa saepe dolor! Voluptatem, illum!</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button class="controller"><</button>
                    <button class="controller">></button>
                </div>
            <section>
                <h2>Obras sugeridas</h2>
                <div class="slider-container" currentSlideIndex="0">
                    <div class="slider">
                        <div class="slide">
                            <div class="slide-content">
                                <img src="../img/img-slider/imagem-1.webp" alt="Imagem 1">
                                <div class="slide-subcontent">
                                    <h1>Faz o incrível</h1>
                                    <p style="width: 100%">Lorem, ipsum dolor sit amet consectetur adipisicing elit. Neque quae, facilis illo officiis debitis consequatur laborum quasi, velit at, praesentium perspiciatis blanditiis ab ea eligendi culpa saepe dolor! Voluptatem, illum!</p>
                                </div>
                            </div>
                        </div>
                        <div class="slide">
                            <div class="slide-content">
                                <img src="../img/img-slider/imagem-2.webp" alt="Imagem 2">
                                <div class="slide-subcontent">
                                    <h1>Faz o incrível</h1>
                                    <p style="width: 100%">Lorem, ipsum dolor sit amet consectetur adipisicing elit. Neque quae, facilis illo officiis debitis consequatur laborum quasi, velit at, praesentium perspiciatis blanditiis ab ea eligendi culpa saepe dolor! Voluptatem, illum!</p>
                                </div>
                            </div>
                        </div>
                        <div class="slide">
                            <div class="slide-content">
                                <img src="../img/img-slider/imagem-3.webp" alt="Imagem 3">
                                <div class="slide-subcontent">
                                    <h1>Faz o incrível</h1>
                                    <p style="width: 100%">Lorem, ipsum dolor sit amet consectetur adipisicing elit. Neque quae, facilis illo officiis debitis consequatur laborum quasi, velit at, praesentium perspiciatis blanditiis ab ea eligendi culpa saepe dolor! Voluptatem, illum!</p>
                                </div>
                            </div>
                        </div>
                        <div class="slide">
                            <div class="slide-content">
                                <img src="../img/img-slider/imagem-4.webp" alt="Imagem 3">
                                <div class="slide-subcontent">
                                    <h1>Faz o incrível</h1>
                                    <p style="width: 100%">Lorem, ipsum dolor sit amet consectetur adipisicing elit. Neque quae, facilis illo officiis debitis consequatur laborum quasi, velit at, praesentium perspiciatis blanditiis ab ea eligendi culpa saepe dolor! Voluptatem, illum!</p>
                                </div>
                            </div>
                        </div>
                        <div class="slide">
                            <div class="slide-content">
                                <img src="../img/img-slider/imagem-5.webp" alt="Imagem 3">
                                <div class="slide-subcontent">
                                    <h1>Faz o incrível</h1>
                                    <p style="width: 100%">Lorem, ipsum dolor sit amet consectetur adipisicing elit. Neque quae, facilis illo officiis debitis consequatur laborum quasi, velit at, praesentium perspiciatis blanditiis ab ea eligendi culpa saepe dolor! Voluptatem, illum!</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button class="controller"><</button>
                    <button class="controller">></button>
                </div>
            </section>
        </main>
        <dialog id='perfil'>
            <div>
                <img src=<?php echo '../uploads/'.$_SESSION['foto']?> alt=''>
                <h2><?php echo $_SESSION['nome']?></h2>
                <h3>Usuário desde <?php echo DateTime::createFromFormat('Y-m-d', $_SESSION['data_cadastro'])->format('d/m/Y');?></h3>
                <form method='POST' enctype='multipart/form-data'>
                        <div>
                            <label for='nome'>NOME:</label>
                            <input required type='text' name='nome' placeholder='nome' value=<?php echo "'".$_SESSION['nome']."'"?>>
                        </div>
                        <div>
                            <label for='email'>EMAIL:</label>
                            <input required type='email' name='email' placeholder='email' value=<?php echo "'".$_SESSION['email']."'"?>>
                        </div>
                        <div>
                            <label for='nick'>NICK:</label>
                            <input required type='text' name='nick' placeholder='nick' value=<?php echo "'".$_SESSION['nick']."'"?>>
                        </div>
                        <div>
                            <label for='senha'>SENHA:</label>
                            <input required type='passwor' name='senha' placeholder='senha' value=<?php echo "'".$_SESSION['senha']."'"?>>
                        </div>
                        <div>
                            <label for='cidade'>CIDADE:</label>
                            <input required type='text' name='cidade' placeholder='cidade' value=<?php echo "'".$_SESSION['cidade']."'"?>>
                        </div>
                        <div>
                            <label for='telefone'>TELEFONE:</label>
                            <input required type='tel' name='telefone' placeholder='telefone' value=<?php echo "'".$_SESSION['telefone']."'"?>>
                        </div>
                        <div>
                            <label for='foto'>FOTO:</label>
                            <input type='file' name='novaFoto' placeholder='foto'>
                        </div>
                        <input type='submit' name='atua' value='Atualizar'>
                </form>
            </div>
        </dialog>
        <dialog id='coment'>
            <h2>Comentários</h2>
            <div></div>
            <form class="message">
                <input id='comentArea' required type='text' name='texto' placeholder='Comente aqui'>
                <input id='addComent' type='submit' name='add' value='Enviar'>
            </form>
        </dialog>
        <dialog id='gComent'>
            <div>
                <label for="nome">Nome:</label>
                <input id="nome" type="text" />
                <label for="texto">Texto:</label>
                <input id="texto" type="text" />
            </div>
            <div>
                <?php
                    $sqlRes = $conn->query();
                    while ($res = $sqlRes->fetch())
                        echo Comment($res, true);
                ?>
            </div>
        </dialog>
        <dialog id='gPerfils'>
            <div>
                <label for="nome">Nome:</label>
                <input type="text" />
            </div>
            <div>
                <?php
                    $sqlRes = $conn->query("SELECT * FROM `usuarios` LIMIT 20;");
                    while ($res = $sqlRes->fetch()) {
                        echo $res['nome']."<br/>";
                    }
                ?>
            </div>
        </dialog>
        <footer>
            <p id='pFooter'>Política de privacidade | © 2023. Todos os direitos reservados.</p>
        </footer>
    </body>
</html>
