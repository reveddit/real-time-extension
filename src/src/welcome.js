import {subscribeUser} from './storage.js'
import {getLoggedinUser} from './requests.js'

const $statusMessage = $('#status-message')
const $instructions = $('#instructions')
const $checkBtn = $('#check-connection')

function setStatus(message, type) {
    $statusMessage.text(message)
    $statusMessage.removeClass('checking success error').addClass(type)
}

function checkConnection() {
    $checkBtn.prop('disabled', true)
    setStatus('Checking Reddit connection...', 'checking')
    
    getLoggedinUser()
    .then((user) => {
        if (user) {
            setStatus(`Connected as ${user}! Redirecting...`, 'success')
            $instructions.hide()
            
            // Subscribe the user and redirect to their Reveddit page
            subscribeUser(user, () => {
                // Trigger immediate lookup
                try {
                    chrome.runtime.sendMessage({action: 'immediate-user-lookup', user})
                } catch (e) {}
                
                // Redirect to Reveddit user page
                setTimeout(() => {
                    window.location.href = `https://www.reveddit.com/user/${user}?all=true`
                }, 1000)
            }, (error) => {
                // Already subscribed or other error - still redirect
                setTimeout(() => {
                    window.location.href = `https://www.reveddit.com/user/${user}?all=true`
                }, 1000)
            })
        } else {
            setStatus('Not connected. Please log in to Reddit first.', 'error')
            $instructions.show()
            $checkBtn.prop('disabled', false)
        }
    })
    .catch((err) => {
        console.log('Error checking connection:', err)
        setStatus('Connection check failed. Please try again.', 'error')
        $checkBtn.prop('disabled', false)
    })
}

// Initial check on page load
$(document).ready(() => {
    checkConnection()
})

// Button click handler
$checkBtn.on('click', checkConnection)
