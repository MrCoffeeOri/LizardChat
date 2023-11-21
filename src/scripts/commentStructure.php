<?php
    function Comment($messageData, $isAdm = false) : string {
        return "
        <form class='mensagem message' id='".$messageData['id']."'>
            <input type='number' name='id' value='".$messageData['id']."' style='display: none'/>
            <p>".$messageData['dataP']."</p>
            ".($isAdm ? "<p>".$messageData['nick']."</p>" : "")."
            <textarea maxlength='250' name='texto'>".$messageData['texto']."</textarea>
            <div class='divButtons'> <input type='submit' id='deleta' name='delete' value='Deletar' /> </div>
            <div class='divButtons'> <input type='submit' id='atualiza' name='update' value='Atualizar' /> </div>
        </form>
        ";
    }
?>