document.querySelector('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.target.querySelector('button'),status=document.querySelector('#login-status');button.disabled=true;status.textContent='Verificando acesso…';
  try{const response=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:document.querySelector('#password').value})});const body=await response.json();if(!response.ok)throw new Error(body.error||'Não foi possível entrar. Tente novamente.');document.querySelector('#password').value='';window.location.assign('/painel');}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
});
