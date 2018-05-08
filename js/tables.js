const {
    ipcRenderer,
    remote
} = eRequire('electron');
const os = eRequire('os');
const fse = eRequire('fs-extra');

const storage = eRequire('electron-json-storage');

let destPath = 'c:\\softer\\Sincronizador\\config';

// let stack_bottomright = {
//     "dir1": "down",
//     "dir2": "right",
//     "push": "top"
// };

$(function () {

    $('#passwordModal').modal();

    // console.log(destPath);
    storage.setDataPath(destPath);

    const peopleFile = `${destPath}\\people_table.txt`,
        productsFile = `${destPath}\\products_table.txt`,
        itemsFile = `${destPath}\\items_table.txt`;

    fse.readFile(peopleFile, function (err, data) {
        if (err) {
            fse.writeFileSync(peopleFile, 'bairro,cadpais,cep,cidade,estado,financeira,fisica,logradouro,obscliente,pessoas,pessoatipocobranca,profissoes,regioes,telefone,tipologradouro,tipopessoa,tipotelefone', 'utf-8');
            return console.log(err);
        }
        peopleTableList = fse.readFileSync(peopleFile, 'utf8');
        $('#textareaPeople').val(peopleTableList.replace(/,\s*$/, ""));

        Materialize.updateTextFields();
    });

    fse.readFile(productsFile, function (err, data) {
        if (err) {
            fse.writeFileSync(productsFile, 'categoria,colecao,custoproduto,grades,grupo,gruposubgrupo,itens_grade,itens_grade_estoque,parametros_produto,produto,produtofornecedor,subgrupo', 'utf-8');
            return console.log(err);
        }
        productsTableList = fse.readFileSync(productsFile, 'utf8');
        $('#textareaProducts').val(productsTableList.replace(/,\s*$/, ""));

        Materialize.updateTextFields();
    });

    fse.readFile(itemsFile, function (err, data) {
        if (err) {
            fse.writeFileSync(itemsFile, 'entrada,entradaitens', 'utf-8');
            return console.log(err);
        }
        itemsTableList = fse.readFileSync(itemsFile, 'utf8');
        $('#textareaItems').val(itemsTableList.replace(/,\s*$/, ""));

        Materialize.updateTextFields();
    });

    $('#btnSaveTables').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        $('#passwordModal').modal('close');

        if ($('#passwd').val() == 'sftk123') {
            try {
                if ($('#textareaProducts').val())
                    fse.writeFileSync(productsFile, $('#textareaProducts').val(), 'utf-8');

                if ($('#textareaPeople').val())
                    fse.writeFileSync(peopleFile, $('#textareaPeople').val(), 'utf-8');

                if ($('#textareaItems').val())
                    fse.writeFileSync(itemsFile, $('#textareaItems').val(), 'utf-8');

                new PNotify({
                    title: "Sucesso",
                    text: "Dados armazenados. Lembre de recarregar a tela principal.",
                    type: 'success',
                    icon: false,
                    addclass: "stack-bottomright"
                });

            } catch (e) {
                alert('Falha ao salvar as informações !');
            }
        } else {
            new PNotify({
                title: "Senha inválida!",
                type: 'error',
                icon: false,
                addclass: "stack-bottomright",
                delay: 6000
            });
        }

        $('#passwd').val(null);
    });

    $('#btnCloseTables').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        var window = remote.getCurrentWindow();
        window.close();
    });

});