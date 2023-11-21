<?php
    session_start();
    if (isset($_SESSION['erro'])) {
        echo "<script defer>alert('".$_SESSION['erro']."')</script>";
        unset($_SESSION['erro']);
    }
?>
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="./css/index.css">
        <meta name="description" content="Museu Paulo Agostinho Sobrinho">
        <link rel="icon" type="image/png" href="./img/icons/icon-museu-pap.webp"/>
        <title>Museu Paulo Agostinho Sobrinho</title>
        <script src="./scripts/index.js" defer type="module"></script>
    </head>
    <body>
        <dialog id="form-login">
            <form  id="loginF " action="./pages/home.php" method="post" enctype="multipart/form-data">
                <div>
                    <label for="email">EMAIL:</label>
                    <input required type="text" id="email" name="email" placeholder="Entre com seu email"><br><br>
                    <label for="senha">SENHA:</label>
                    <input required type="password" id="senha" name="senha" placeholder="Entre com sua senha"><br>
                </div>
                <input type="submit" name="login" value="Acessar Conta" >
                <a id="linkCrtAcc"href="#">Criar uma conta</a>
            </form>
        </dialog>
        <nav>
            <img src="./img/icons/icon-museu-pap.webp" alt="Logo">
            <div style="width: 90vw;display: flex;align-items: center;">
                <div class="link">
                    <a id="access" href="#Acessar">Acessar</a>
                    <div></div>
                </div>
                <div class="link">
                    <a href="pages/integrantes.html">Integrantes do Grupo</a>
                    <div></div>
                </div>
            </div>
            <img src="./img/icons/eye.png" id="acc" show="false" alt="engrenagem">
        </nav>
        <main>
            <section id="init">
                <div>
                    <h1 id="titleMuseu">Museu<br/>Paulo Agostinho<br/>Sobrinho</h1>
                    <button>Saiba mais <span style="display: none;">&darr;</span></button>
                </div>
                <img src="./img/escultura.webp" alt="">
            </section>
            <div id="saibaMais"> 
                <section class="info">
                    <h2>O melhor museu de Racatinga</h2>
                    <p>Este é um espaço cultural de grande importância para a cidade, e para todo o país, que abriga um acervo inestimável de obras de arte, artefatos históricos e uma coleção vasta de objetos de diferentes períodos e culturas. </p> 
                    <p>Seu acervo inclui obras de grandes artistas, como Portinari, Di Cavalcanti e Tarsila do Amaral, além de objetos raros que contam a história da cidade e de sua região. O espaço conta com uma equipe de profissionais altamente qualificados, que garantem a preservação e a conservação das obras, bem como a realização de atividades educativas e culturais para a população local e visitantes. </p>
                    <p>Além disso, o museu promove exposições temporárias, que trazem para a cidade obras de artistas nacionais e internacionais, tornando Racatinga um importante polo cultural. O museu de Paulo Agostinho Sobrinho é, sem dúvida, um local de grande valor para a cidade de Racatinga e para todos aqueles que se interessam pela cultura e pela arte. Suas obras e objetos permitem uma viagem no tempo e uma conexão com a história, a cultura e a arte do Brasil e do mundo, tornando-se uma referência obrigatória para os amantes da cultura e do conhecimento.</p>
                </section>
                <section>
                    <hr>
                    <h2 id="titleSlider">Um grande acervo acessível, gratuíto e simples de obras de nossa cidade</h2>
                    <hr>
                    <div>
                        <div>
                            <img src="img/img-slider/imagem-1.webp" alt="Pintura de Vincent Van Gogh intitulada de Irises. Nessa pintura temos um grande jardim com flores azuis,brancas e laranjas. As flores azuis aparecem no primeiro plano da pintura e as laranjas aparecem no segundo plano.">
                            <img src="img/img-slider/imagem-2.webp" alt="Pintura de Jean-Honoré Fragonard intitulada de The Fountain of Love. Nessa pintura temos um ambiente natural ao fundo, onde se tem no primeiro plano um casal em que está recebendo água de uma fonte por pequenos anjos.Essa fonte é a fonte do amor.">
                            <img src="img/img-slider/imagem-3.webp" alt="Pintura de Rembrandt Harmensz intitulada de Rembrandt Laughing. Nessa pintura vemos o próprio retrato de Rembrandt sobre o disfarce de um soldado,relaxado e envolvendo o espectador com uma risada.">
                            <img src="img/img-slider/imagem-4.webp" alt="Pintura de Pierre-Auguste Renoir intitulada de La Promenade. Nessa pintura vemos um homem e uma mulher, possivelmente um casal que acabaram de se casar,pois ambos estão com roupas de casamento, caminhando em um local natural cheio de arbustos e árvores ao fundo.">
                            <img src="img/img-slider/imagem-5.webp" alt="Pintura de Peter Paul Rubens intitulada de The Calydonian Boar Hunt. Nessa pintura temos homens gregos arrodeados de pessoas em um ambiente natural matando o famoso javali Calidônico.">
                            <img src="img/img-slider/imagem-6.webp" alt="Pintura de Parmigianino intitulada de Virgin and Child with St. John the Baptist and Mary Magdalene. Nessa pintura temos um ambiente natural no segundo plano, e no primeiro plano uma mulher cuidando de várias crianças.">
                            <img src="img/img-slider/imagem-7.webp" alt="Pintura de Jean-Étienne Liotard intitulada de Maria Frederike van Reede-Athlone at Seven. Nessa pintura temos o retrato de uma menina loira no estilo 3 por 4 (de lado) com um casaco de frio azul com branco e laços azuis no cabelo, segurando um cachorro porte pequeno cor preta nos braços.">
                            <img src="img/img-slider/imagem-8.webp" alt="Pintura de Giovanni Antonio Canal intitulada de The Grand Canal in Venice from Palazzo Flangini to Campo San Marcuola. Nessa pintura temos um grande canal de água delimitado por edifícios onde se tem pessoas em canoas navegando pelo grande canal de água.">
                            <img src="img/img-slider/imagem-9.webp" alt="Pintura de Walker Evans intitulade de Washroom in the Dog Run of the Burroughs Home, Hale County, Alabama. Nessa pintura temos uma casa de madeira onde se tem uma espécie de mesa com dois potes e ao lado um prego com uma toalha presa em um batente de porta.">
                            <img src="img/img-slider/imagem-10.webp" alt="Pintura de Rembrandt Harmensz intitulada de The Abduction of Europa. Nessa pintura temos 5 pessoas em um floresta banhada por água onde uma delas está fugindo a cavalo pela água e as outras estão observando sem acreditar.">
                        </div>
                    </div>
                    <hr>
                </section>
                <section class="info infoCol">
                    <h2>História do museu</h2>
                    <p>Racatinga é uma cidade localizada no interior de São Paulo, conhecida por sua rica história e forte influência do médico Paulo Agostinho Sobrinho. No início da história da cidade, Sobrinho foi uma figura importante, tendo realizado diversas ações que ajudaram no desenvolvimento da região.
                        Sobrinho era um médico que se dedicava a atender a população local, mesmo em condições adversas. Ele lutou pela melhoria das condições de vida dos habitantes de Racatinga, defendendo seus direitos e exigindo melhorias nos serviços públicos.
                        Com o passar dos anos, a cidade cresceu e se desenvolveu, mas nunca esqueceu a figura de Paulo Agostinho Sobrinho. </p> 
                </section>
                   <img id="imgMuseu" src="img/historia-imgs/museu-wikipedia.webp">
                <section class="info infoCol">
                    <div>
                        <p> Em homenagem à sua contribuição para a cidade, foi criado o Museu Paulo Agostinho Sobrinho, que conta a história da cidade e do médico que fez a diferença na vida de tantas pessoas. O museu conta com um acervo de peças associadas ao contexto histórico da cidade, incluindo objetos pessoais de Sobrinho, documentos antigos e fotografias que retratam a evolução de Racatinga ao longo dos anos.
                        Hoje, o Museu Paulo Agostinho Sobrinho é um ponto de referência para a cidade, atraindo turistas e visitantes interessados em conhecer mais sobre a história da região e a vida de um homem que deixou sua marca na cidade de Racatinga.Dentro do museu, existem diversas áreas que exploram diferentes aspectos da vida e obra de Sobrinho.
                        Uma das áreas mais importantes do museu é a sala dedicada a explorar as experiências, lutas e vitórias de Paulo Agostinho Sobrinho à cidade de Racatinga. Nesta sala, é possível conhecer mais sobre a trajetória do médico e seu papel fundamental no desenvolvimento da região. </p>
                    </div>
                    <div>
                        <p> Além disso, o museu também conta com uma área dedicada à história da cidade, que apresenta um panorama completo da evolução de Racatinga ao longo dos anos. Esta área inclui fotografias, documentos e objetos que ilustram a vida cotidiana dos habitantes da cidade em diferentes épocas. Outra área importante do museu é a dedicada à medicina e saúde, que apresenta um histórico dos avanços e descobertas médicas ao longo do tempo. Esta área é especialmente relevante, dada a importância que Sobrinho teve como médico na cidade de Racatinga. Além destas áreas principais, o museu conta com outras salas e espaços que exploram diferentes aspectos da vida e obra de Paulo Agostinho Sobrinho, incluindo sua atuação política, sua relação com a comunidade local e sua importância como figura pública. Em suma, o Museu Paulo Agostinho Sobrinho é um espaço que reúne diferentes áreas e temas relacionados à história da cidade de Racatinga e à figura do médico que se tornou um símbolo da região. </p>
                    </div>
                </section>
                <section class="comentarios">
                    <h2>Comentários de nossos usuários</h2>
                    <div style="display: flex; flex-wrap: wrap; justify-content: space-evenly; padding-bottom: 2%;">
                        <?php
                            include './scripts/conn.php';
                            $messages = $conn->query("SELECT u.nick, u.foto, c.texto FROM comentarios c JOIN usuarios u ON u.id = c.userID;");
                            if (empty($messages)) {
                                echo "<h2>Nenhum comentário foi adicionado</h2>";
                                return;
                            }
                            while ($messageRow = $messages->fetch()) {
                                echo "
                                    <div class='coment'>
                                        <img class='imgComent' src='./uploads/".$messageRow['foto']."'/>
                                        <div>
                                            <p> Nick: ".$messageRow['nick']."</p>
                                            <p>".$messageRow['texto']."</p>
                                        </div>
                                    </div>
                                ";
                            }  
                        ?>
                    </div>
                </section>
            </div>
        </main>
        <footer>
            <p id="pFooter">Política de privacidade | © 2023. Todos os direitos reservados.</p>
        </footer>
    </body>
</html>
