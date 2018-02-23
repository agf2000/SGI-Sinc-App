const {
    ipcRenderer,
    remote
} = eRequire('electron');
const os = eRequire('os');
const fse = eRequire('fs-extra');

let destPath = os.tmpdir() + '\\tables';

let stack_bottomright = {
    "dir1": "down",
    "dir2": "right",
    "push": "top"
};

$(function () {

    // console.log(os.tmpdir());
    fse.mkdirsSync(destPath);

    const peopleFile = `${destPath}\\people_table.txt`,
        productsFile = `${destPath}\\products_table.txt`,
        itemsFile = `${destPath}\\items_table.txt`;

    fse.readFile(peopleFile, function (err, data) {
        if (err) {
            fse.writeFileSync(peopleFile, 'bairro,categoria,cep,cidade,classes,clicobranca,colecao,condicaopagto,contatos,convenio,creditocliente,estado,financeira,fisica,juridica,logradouro,meios_pagto,obscliente,operadora,pessoas,profissoes,regioes,spc,spcparcelas,telefone,tipocobranca,tipocredito,tipologradouro,tipopessoa,tiporeferencia,tipospagamentos,tipotelefone', 'utf-8');
            return console.log(err);
        }
        peopleTableList = fse.readFileSync(peopleFile, 'utf8');
        $('#textareaPeople').val(peopleTableList.replace(/,\s*$/, ""));

        Materialize.updateTextFields();
    });

    fse.readFile(productsFile, function (err, data) {
        if (err) {
            fse.writeFileSync(productsFile, 'categoria,colecao,custoproduto,entrada,entradaitens,grades,grupo,gruposubgrupo,itens_grade,itens_grade_estoque,parametros_produto,produto,produtofornecedor,subgrupo', 'utf-8');
            return console.log(err);
        }
        productsTableList = fse.readFileSync(productsFile, 'utf8');
        $('#textareaProducts').val(productsTableList.replace(/,\s*$/, ""));

        Materialize.updateTextFields();
    });

    fse.readFile(itemsFile, function (err, data) {
        if (err) {
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

        try {
            if ($('#textareaProducts').val())
                fse.writeFileSync(productsFile, $('#textareaProducts').val(), 'utf-8');

            if ($('#textareaPeople').val())
                fse.writeFileSync(peopleFile, $('#textareaPeople').val(), 'utf-8');

            if ($('#textareaItems').val())
                fse.writeFileSync(itemsFile, $('#textareaItems').val(), 'utf-8');

            new PNotify({
                title: "Sucesso",
                text: "Dados armazenados.",
                type: 'success',
                icon: false,
                addclass: "stack-bottomright",
                stack: stack_bottomright
            });
        } catch (e) {
            alert('Failed to save the file !');
        }
    });

});