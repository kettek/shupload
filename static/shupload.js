/*
@licstart The following is the entire license notice for the JavaScript code in
this page.

Copyright 2018-2019 Ketchetwahmeegwun T. Southall

This file is part of shupload.

shupload is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

shupload is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with shupload.  If not, see <https://www.gnu.org/licenses/>.

@licend The above is the entire license notice for the JavaScript code in this
page.

----

This file is an optional JavaScript enhancement for shupload. It provides:

  * File selection (akin to non-JS shupload, but prettier)
  * Drag 'n' drop support
  * Camera capturing
  * Desktop/Window capturing, if supported (only Edge atm)
  * Clipboard pasting

FIXME: This is pretty weird and messy!
TODO: actual comments
*/
let shupload =  (function() {
  // Canvas toBlob Polyfill for Edge, courtesy of https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob#Polyfill
	if (!HTMLCanvasElement.prototype.toBlob) {
	  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
	    value: function (callback, type, quality) {
	      var dataURL = this.toDataURL(type, quality).split(',')[1]
	      setTimeout(function() {
	        var binStr = atob( dataURL ),
	            len = binStr.length,
	            arr = new Uint8Array(len)
	        for (var i = 0; i < len; i++ ) {
	          arr[i] = binStr.charCodeAt(i)
	        }
	        callback( new Blob( [arr], {type: type || 'image/png'} ) )
	      });
	    }
	  });
	}
  // Offscreen canvas and context
  let Canvas = document.createElement('canvas')
  let Context = Canvas.getContext('2d')
  // Individual sections -- generates to tabs and tab contents
  let Sections = [
    { name: "🖼️ File",
      component: {
        view: () => {
          return [
            m(".Button", {
              onclick: selectFile
            }, "⇪ Select file"),
            m(".Label", { style: "margin-top:1em" }, "or"),
            m(".Label", "🖱 Drop file"),
          ]
        }
      }
    },
    // TODO: merge the media requests of Camera and Desktop capture
    { name: "📷 Camera",
      disabled: navigator.mediaDevices.getUserMedia ? false : true,
      component: {
        view: (pv) => {
          return [
            m("video" + (pv.state.pictureTaken ? '.hidden' : ''), {
              oncreate: (vnode) => {
                pv.state.video = vnode.dom
                navigator.mediaDevices.getUserMedia({
                  video: true
                }).then((stream) => {
                  pv.state.filename = stream.getVideoTracks()[0].label
                  vnode.dom.srcObject = stream
                }).catch((err) => {
                  alert(err)
                })
              },
              onremove: (vnode) => {
                if (vnode.dom && vnode.dom.srcObject) vnode.dom.srcObject.getVideoTracks().forEach(track => track.stop())
                delete pv.state.video
              },
              autoplay: true
            }),
            (pv.state.pictureTaken ? 
              m(".Preview", {
                style: "background-image: url("+Canvas.toDataURL()+");"
              })
            :
              null),
            m(".Buttons",
              (pv.state.pictureTaken ?
                [
                  m(".Button", {
                    onclick: () => {
                      pv.state.pictureTaken = false
                      navigator.mediaDevices.getUserMedia({
                        video: true
                      }).then((stream) => {
                        pv.state.video.srcObject = stream
                      }).catch((err) => {
                        alert(err)
                      })
                    }
                  }, "↩ Retake"),
                  m(".Button", {
                    onclick: () => {
                    	Canvas.toBlob((blob) => {
                        sendFile(blob, pv.state.filename+".png")
                    	})
                    }
                  }, "⇪ Upload")
                ]
              :
                m(".Button", {
                  onclick: () => {
                    pv.state.pictureTaken = true
                    Canvas.width = pv.state.video.videoWidth
                    Canvas.height = pv.state.video.videoHeight
                    Context.drawImage(pv.state.video, 0, 0, Canvas.width, Canvas.height)
                    if (pv.state.video && pv.state.video.srcObject) pv.state.video.srcObject.getVideoTracks().forEach(track => track.stop())
                  }
                }, "📸 Capture")
              )
            )
          ]
        }
      }
    },
    { name: "🖥️ Display",
      disabled: navigator.mediaDevices.getDisplayMedia ? false : true,
      component: {
        view: (pv) => {
          return [
            m("video", {
              oncreate: (vnode) => {
                pv.state.video = vnode.dom
                // TODO: Edge uses getDisplayMedia, while spec says mediaDevices.getDisplayMedia -- investigate this.
                if (navigator.getDisplayMedia) {
                  navigator.getDisplayMedia({
                    video: true
                  }).then((stream) => {
                    pv.state.filename = stream.getVideoTracks()[0].label
                    vnode.dom.srcObject = stream
                  }).catch((err) => {
                    console.log(err)
                    alert(err)
                  })
                } else {
                  navigator.mediaDevices.getDisplayMedia({
                    video: true
                  }).then((stream) => {
                    pv.state.filename = stream.getVideoTracks()[0].label
                    vnode.dom.srcObject = stream
                  }).catch((err) => {
                    console.log(err)
                    alert(err)
                  })
                }
              },
              onremove: (vnode) => {
                if (vnode.dom && vnode.dom.srcObject) vnode.dom.srcObject.getVideoTracks().forEach(track => track.stop())
                delete pv.state.video
              },
              autoplay: true
            }),
            (pv.state.pictureTaken ? 
              m(".Preview", {
                style: "background-image: url("+Canvas.toDataURL()+");"
              })
            :
              null),
            m(".Buttons",
              (pv.state.pictureTaken ?
                [
                  m(".Button", {
                    onclick: () => {
                      pv.state.pictureTaken = false
                      if (navigator.getDisplayMedia) {
                        navigator.getDisplayMedia({
                          video: true
                        }).then((stream) => {
                          pv.state.video.srcObject = stream
                        }).catch((err) => {
                          console.log(err)
                          alert(err)
                        })
                      } else {
                        navigator.mediaDevices.getDisplayMedia({
                          video: true
                        }).then((stream) => {
                          pv.state.video.srcObject = stream
                        }).catch((err) => {
                          console.log(err)
                          alert(err)
                        })
                      }
                    }
                  }, "↩ Retake"),
                  m(".Button", {
                    onclick: () => {
                    	Canvas.toBlob((blob) => {
                        sendFile(blob, pv.state.filename+".png")
                    	})
                    }
                  }, "⇪ Upload")
                ]
              :
                m(".Button", {
                  onclick: () => {
                    pv.state.pictureTaken = true
                    Canvas.width = pv.state.video.videoWidth
                    Canvas.height = pv.state.video.videoHeight
                    Context.drawImage(pv.state.video, 0, 0, Canvas.width, Canvas.height)
                    if (pv.state.video && pv.state.video.srcObject) pv.state.video.srcObject.getVideoTracks().forEach(track => track.stop())
                  }
                }, "📸 Capture")
              )
            )
          ]
        }
      }
    },
    { name: "📋 Clipboard",
      component: {
        oncreate: (vnode) => {
          vnode.dom.focus()
        },
        view: () => {
          return m("textarea.Clipboard", {
            placeholder: "Use ⌃v or ⌘v to paste an image here.",
            onpaste: (e) => {
              if (e.clipboardData && e.clipboardData.items) {
                let items = e.clipboardData.items
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf('image') !== -1) {
                    sendFile(items[i].getAsFile())
                    e.preventDefault();
                  }
                }
              }
            }
          })
        }
      }
    },
  ]
  // Upload Bar located at the bottom of the view
  let UploadBar = {
    StateClasses: [
      "",
      ".pending",
      ".error",
      ".success"
    ],
    States: {
      Idle: 0,
      Sending: 1,
      Errored: 2,
      Success: 3
    },
    State: 0,
    Total: 0,
    Sent: 0,
    Progress: 0,
    StartTime: new Date(),
    CurrentTime: new Date(),
    RemainingTime: 0,
    TargetTime: 2500,
    UpdateTotals: (sent, total) => {
      UploadBar.Sent = Math.round(sent/1024)
      UploadBar.Total = Math.round(total/1024)
      UploadBar.Progress = (sent / total) * 100
    },
    Component: {
      view: () => {
        return m("#UploadBar" + UploadBar.StateClasses[UploadBar.State], {
        }, (
          UploadBar.State == UploadBar.States.Idle ?
            "Idle"
            :
          UploadBar.State == UploadBar.States.Sending ?
            "Sent: " + (UploadBar.Sent + " / " + UploadBar.Total + " kB")
            :
          UploadBar.State == UploadBar.States.Errored ?
            "Error"
            :
            ("Uploaded, redirecting in " + (UploadBar.RemainingTime.toFixed(1)) + "s")
        ))
      }
    }
  }
  // Main state and rendering component
  let Main = {
    CurrentSection: 0,
    CurrentState: 0,
    States: {
      Clean: 0,
      Uploading: 1,
      Uploaded: 2,
      Errored: 3
    },
    Uploading: {
      Sending: false,
      Total: 0,
      Sent: 0,
      Progress: 0,
    },
    Component: {
      view: () => {
        return m("section#Main", {
          ondrop: (e) => {
            e.stopPropagation()
            e.preventDefault()
            sendFile(e.dataTransfer.files[0])
          },
          ondragover: (e) => {
            e.stopPropagation()
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
          }
        }, [
          m("section.Tabs", Sections.map((section, index) => {
            return m(".Tab" + (section.disabled ? ".disabled" : "") + (Main.CurrentSection == index ? '.selected' : ''), {
              onclick: () => {
                if (section.disabled) return
                Main.CurrentSection = index
              }
            }, section.name)
          })),
          m("section.TabContent", {
          }, m(Sections[Main.CurrentSection].component)),
          m(UploadBar.Component)
        ])
      }
    }
  }
  // Method for sending a file via POST
  function sendFile(file, filename) {
    UploadBar.State = UploadBar.States.Sending
    let r = new XMLHttpRequest()
    let d = new FormData()
    //r.setRequestHeader('Content-type', 'multipart/form-data')
    if (filename !== undefined) {
      d.append('file', file, filename)
    } else {
      d.append('file', file)
    }
    r.addEventListener('load', (e) => {
      UploadBar.State = UploadBar.States.Success
      UploadBar.StartTime = new Date()
      let load_interval = window.setInterval(() => {
        UploadBar.CurrentTime = new Date()
        UploadBar.RemainingTime = (UploadBar.TargetTime - (UploadBar.CurrentTime - UploadBar.StartTime)) / 1000
        m.redraw()
        if (UploadBar.RemainingTime <= 0) {
          clearInterval(load_interval)
          UploadBar.RemainingTime = 0
          window.location.assign(r.responseURL)
        }
      }, 100)
      m.redraw()
    })
    r.upload.addEventListener('progress', (e) => {
      UploadBar.UpdateTotals(e.loaded, e.total)
      m.redraw()
    })
    r.addEventListener('error', (e) => {
      UploadBar.State = UploadBar.States.Errored
    })
    r.open('POST', '')
    r.send(d)
  }
  // Method for presenting the user with a file select prompt
  function selectFile() {
    let inp = document.createElement('input')
    inp.setAttribute('type', 'file')
    inp.setAttribute('accept', 'image/*')
    inp.style = "display:none";
    inp.addEventListener('change', (e) => {
      sendFile(e.target.files[0])
      inp.parentNode.removeChild(inp)
    })
    // element must exist for iOS so we add it
    document.body.appendChild(inp)
    inp.click()
  }

  // Status bar
  let StatusBar = {
    Component: {
      view: () => {
        return m("#StatusBar", View.CreationTime)
      }
    }
  }
  // View state and rendering component
  let View = {
    Filename: "",
    Entryname: "",
    Type: "",
    HiddenImage: document.createElement('img'),
    TabContent: null,
    ImageHeight: "",
    ImageWidth: "",
    isZoomed: false,
    isScaled: false,
    calculateImageSize: () => {
      if (!View.TabContent) return
      if (View.isZoomed) {
        View.ImageWidth = View.HiddenImage.width
        View.ImageHeight = View.HiddenImage.height
        return
      }
      let b = View.TabContent.getBoundingClientRect()
      let r = Math.min(b.width / View.HiddenImage.width, b.height / View.HiddenImage.height)
      View.isScaled = r > 1 ? true : false
      View.ImageWidth = View.HiddenImage.width * r
      View.ImageHeight = View.HiddenImage.height * r
      m.redraw()
    },
    Component: {
      view: (vnode) => {
        return m("section#Main.View", {
        }, [
          m("section.Tabs", [
            m('a', {
              href: './',
              title: "Return to Upload"
            }, m('section.Tab', '↩')),
            m('.Label', {
              style: "flex: 1;"
            }, [
              m('a', {
                href: View.Entryname,
                onclick: (e) => {
                  e.preventDefault()
                  // Attempt to use modern clipboard functionality
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(e.target.href).then(() => {
                    }, (err) => {
                      console.log(err)
                      alert(err)
                    })
                  // Otherwise use THE CLASSIC.
                  } else {
                    let link = document.createElement('a')
                    link.href = View.Entryname
                    let Textarea = document.createElement('textarea')
                    Textarea.value = link.href
                    document.body.appendChild(Textarea)
                    Textarea.focus()
                    Textarea.select()
                    try {
                      let success = document.execCommand('copy')
                      if (!success) {
                        alert('could not copy to clipboard')
                      }
                    } catch (err) {
                      console.log(err)
                      alert(err)
                    }
                    document.body.removeChild(Textarea)
                  }
                },
                title: "Copy Link to Clipboard"
              }, '🔗'),
              m('.Label', View.Filename),
              m('a', {
                href: View.Entryname+'/'+View.Filename,
                title: "Download file"
              }, '⬇')
            ])
          ]),
          m("section.TabContent" + (View.isScaled ? (".Scaled" + (View.isZoomed ? ".ZoomedOut" : ".ZoomedIn")) : (View.isZoomed ? ".ZoomedIn" : ".ZoomedOut")),
            { 
              oncreate: (vnode) => {
                View.TabContent = vnode.dom
              }
            },
            [
            View.Type === "image" ? 
              m('.DataContainer'+ (View.ImageZoom ? '.Zoomed' : ''), {
                style: "width: "+View.ImageWidth+"px;height: "+View.ImageHeight+"px;background-image: url(" + View.Entryname + "/" + View.Filename + ");",
                onclick: e => {
                  e.preventDefault()
                  View.isZoomed = !View.isZoomed
                  View.calculateImageSize()
                }
              })
            : View.Type === "audio" ?
              m('.DataContainer', 
                m('audio', {
                  controls: true,
                  src: View.Entryname+"/"+View.Filename,
                })
              )
            : View.Type === "video" ?
              m('.DataContainer',
                m('video', {
                  controls: true,
                }, m('source', {
                  src: View.Entryname+"/"+View.Filename,
                  type: View.Mimetype,
                }))
              )
            : m('.DataContainer', m.trust(View.DataHTML))
          ]),
          m(StatusBar.Component)
        ])
      }
    }
  }
  let $ = {
    letsGo: () => {
      let target = document.getElementById("Container")
      if (target.children[0].className == "View") {
        let fpart = document.getElementById("Filename")
        if (fpart) {
          View.Filename = fpart.innerText
        }
        // First we retrieve the image reference
        let img = document.getElementsByTagName("img")[0]
        let audio = document.getElementsByTagName("audio")[0]
        let video = document.getElementsByTagName("video")[0]
        if (img) {
          let parts = img.getAttribute('src').split('/')
          View.Entryname = parts[0]
          View.Type = "image"
          View.HiddenImage.addEventListener('load', e => {
            View.calculateImageSize()
          })
          window.addEventListener('resize', e => {
            View.calculateImageSize()
          })
          View.HiddenImage.src = parts.join('/')
        } else if (audio) {
          let parts = audio.getAttribute('src').split('/')
          View.Entryname = parts[0]
          View.Type = "audio"
        } else if (video) {
          let source = video.getElementsByTagName("source")[0]
          if (source) {
            let parts = source.getAttribute('src').split('/')
            View.Entryname = parts[0]
            View.Type = "video"
            View.Mimetype = source.getAttribute('type')
          }
        } else {
          let target = document.getElementsByClassName("Label")[0]
          let a = target.getElementsByTagName("a")[0]
          if (a) {
            let parts = a.getAttribute('href').split('/')
            View.Entryname = parts[0]
          }
          View.DataHTML = document.getElementsByClassName("DataContainer")[0].innerText
        }
        View.CreationTime = document.getElementById("StatusBar").innerHTML
        m.mount(document.getElementById("Container"), View.Component)
      } else if (target.children[0].className == "Upload") {
        m.mount(document.getElementById("Container"), Main.Component)
      }
    }
  }
  return $
})()

window.addEventListener("DOMContentLoaded", () => {
  shupload.letsGo()
})
