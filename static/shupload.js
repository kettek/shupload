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

let shupload = (function () {
  // Method for presenting the user with a file select prompt
  function selectFile() {
    let inp = document.createElement('input')
    inp.setAttribute('type', 'file')
    inp.setAttribute('accept', 'image/*')
    inp.multiple = true
    inp.style = "display:none";
    inp.addEventListener('change', (e) => {
      sendFile(e.target.files)
      inp.parentNode.removeChild(inp)
    })
    // element must exist for iOS so we add it
    document.body.appendChild(inp)
    inp.click()
  }

  // Canvas toBlob Polyfill for Edge, courtesy of https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob#Polyfill
  if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      value: function (callback, type, quality) {
        var dataURL = this.toDataURL(type, quality).split(',')[1]
        setTimeout(function () {
          var binStr = atob(dataURL),
            len = binStr.length,
            arr = new Uint8Array(len)
          for (var i = 0; i < len; i++) {
            arr[i] = binStr.charCodeAt(i)
          }
          callback(new Blob([arr], { type: type || 'image/png' }))
        });
      }
    });
  }
  // Offscreen canvas and context
  let Canvas = document.createElement('canvas')
  let Context = Canvas.getContext('2d')

  // Individual sections -- generates to tabs and tab contents
  let Sections = [
    {
      name: "🖼️ File",
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
    {
      name: "📷 Camera",
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
                style: "background-image: url(" + Canvas.toDataURL() + ");"
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
                        sendFile(blob, pv.state.filename + ".png")
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
    {
      name: "🖥️ Display",
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
                style: "background-image: url(" + Canvas.toDataURL() + ");"
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
                          console.error(err)
                          alert(err)
                        })
                      } else {
                        navigator.mediaDevices.getDisplayMedia({
                          video: true
                        }).then((stream) => {
                          pv.state.video.srcObject = stream
                        }).catch((err) => {
                          console.error(err)
                          alert(err)
                        })
                      }
                    }
                  }, "↩ Retake"),
                  m(".Button", {
                    onclick: () => {
                      Canvas.toBlob((blob) => {
                        sendFile(blob, pv.state.filename + ".png")
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
    {
      name: "📋 Clipboard",
      component: {
        oncreate: (vnode) => {
          vnode.dom.focus()
        },
        view: () => {
          return m("textarea.Clipboard", {
            placeholder: "Use ⌃v or ⌘v to paste a file or files here.",
            onpaste: (e) => {
              if (e.clipboardData && e.clipboardData.items) {
                const items = e.clipboardData.items
                const files = []
                for(const item of items)
                  files.push(item.getAsFile())
                sendFile(files)
                e.preventDefault()
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
      UploadBar.Sent = Math.round(sent / 1024)
      UploadBar.Total = Math.round(total / 1024)
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
            sendFile(e.dataTransfer.files)
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
    const r = new XMLHttpRequest()
    const d = new FormData()
    const files = !file.length ? [file] : file

    //r.setRequestHeader('Content-type', 'multipart/form-data')
    for (const f of files) {
      if (filename !== undefined) {
        d.append('file', f, filename)
      } else {
        d.append('file', f)
      }
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

  // Status bar
  let StatusBar = {
    Component: {
      view: () => {
        return m("#StatusBar", Views[0].CreationTime)
      }
    }
  }

  // this state and rendering component
  const Views = [];
  const parentComponent = () => {
    view: (vnode) => {
      return m("section#Main.View", {
      }, [
        m("section.Tabs", [
          m('a', {
            href: './',
            title: "Return to Upload"
          }, m('section.Tab', '↩')),

        ]),
        m(StatusBar.Component)
      ])
    }
  }
  let currentlyZoomed = false;
  const createView = (solo) => {
    return {
      Filename: "",
      Entryname: "",
      Propername: "",
      Type: "",
      HiddenImage: document.createElement('img'),
      TabContent: null,
      ImageHeight: "",
      ImageWidth: "",
      isZoomed: false,
      isScaled: false,
      calculateImageSize: (view) => {
        if (!view.TabContent) return
        if (view.isZoomed) {
          view.ImageWidth = view.HiddenImage.width
          view.ImageHeight = view.HiddenImage.height

          m.redraw()
          return
        }

        const b = view.TabContent.getBoundingClientRect()
        const r = Math.min(b.width / view.HiddenImage.width, b.height / view.HiddenImage.height)
        view.isScaled = r > 1 ? true : false
        view.ImageWidth = Math.min(view.HiddenImage.width * r, view.HiddenImage.width)
        view.ImageHeight = Math.min(view.HiddenImage.height * r, view.HiddenImage.height)
        m.redraw()
      },
      GetComponent: (view) => {
        return {
          view: (vnode) => {
            return m('.ParentContainer', 
            { style: { display: currentlyZoomed && !view.isZoomed ? 'none' : '' } },
              [
                m('.Label', {
                  style: {
                    flex: 1,
                    // Remove label if any image is zoomed in
                    display: currentlyZoomed ? 'none': ''
                  }
                }, [
                  solo ? m('a', {
                    href: `${view.Entryname}/${view.Filename}`,
                    onclick: (e) => {
                      e.preventDefault()
                      // Attempt to use modern clipboard functionality
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(e.target.href).then(() => {
                        }, (err) => {
                          console.error(err)
                          alert(err)
                        })
                        // Otherwise use THE CLASSIC.
                      } else {
                        let link = document.createElement('a')
                        link.href = view.Entryname
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
                          console.error(err)
                          alert(err)
                        }
                        document.body.removeChild(Textarea)
                      }
                    },
                    title: "Copy Link to Clipboard"
                  }, '🔗') : null,
                  m('.Label', decodeURIComponent(view.Filename)),
                  m('a', {
                    href: view.Entryname + '/' + view.Filename,
                    title: "Download file"
                  }, '⬇')
                ]),
                m("section" + (view.isScaled ? (".Scaled" + (view.isZoomed ? ".ZoomedIn" : ".ZoomedOut")) : (view.isZoomed ? ".ZoomedIn" : ".ZoomedOut")),
                  {
                    oncreate: (vnode) => {
                      view.TabContent = document.getElementsByClassName("TabContent", "NoJS")[0]
                    }
                  },
                  [
                    view.Type === "image" ?
                      m('.DataContainer' + (view.isZoomed ? '.Zoomed' : ''), {
                        style: "width: " + view.ImageWidth + "px;" +
                          "height: " + view.ImageHeight + "px;" +
                          "background-image: url(" + view.Entryname + "/" + view.Filename + ");",
                        onclick: e => {
                          e.preventDefault()
                          view.isZoomed = !view.isZoomed
                          currentlyZoomed = view.isZoomed
                          view.calculateImageSize(view)
                        }
                      })
                      : view.Type === "audio" ?
                        m('.DataContainer',
                          m('audio', {
                            controls: true,
                            src: view.Entryname + "/" + view.Filename,
                          })
                        )
                        : view.Type === "video" ?
                          m('.DataContainer',
                            m('video', {
                              controls: true,
                            }, m('source', {
                              src: view.Entryname + "/" + view.Filename,
                              type: view.Mimetype,
                            }))
                          )
                          : m('.DataContainer', m.trust(view.DataHTML))
                  ])
              ])
          }
        }
      }
    }
  }

  const $ = {
    letsGo: () => {
      const container = document.getElementById("Container")
      if (container.children[0].className == "View") {
        // First we retrieve the data items
        const dataItems = document.getElementsByClassName("DataItem")
        for (const item of dataItems) {
          let view = createView(dataItems.length===1)
          const img = item.getElementsByTagName("img")[0]
          const audio = item.getElementsByTagName("audio")[0]
          const video = item.getElementsByTagName("video")[0]
          if (img) {
            const parts = img.getAttribute('src').split('/')
            view = {
              ...view,
              Entryname: parts[0],
              Filename: parts[1],
              Type: "image"
            }
            view.HiddenImage.addEventListener('load', e => {
              view.calculateImageSize(view)
            })
            window.addEventListener('resize', e => {
              view.calculateImageSize(view)
            })
            view.HiddenImage.src = parts.join('/')
          } else if (audio) {
            const parts = audio.getAttribute('src').split('/')
            view = {
              ...view,
              Entryname: parts[0],
              Filename: parts[1],
              Type: "audio"
            }
          } else if (video) {
            const source = video.getElementsByTagName("source")[0]
            if (source) {
              const parts = source.getAttribute('src').split('/')
              view = {
                ...view,
                Entryname: parts[0],
                Filename: parts[1],
                Type: "video",
                Mimetype: source.getAttribute('type')
              }
            }
          } else {
            const target = item.getElementsByClassName("Label")[0]
            let a = target.getElementsByTagName("a")[0]
            if (a) {
              let parts = a.getAttribute('href').split('/')
              view = {
                ...view,
                Entryname: parts[0],
                Filename: parts[1],
              }
            }
            view.DataHTML = document.getElementsByClassName("DataContainer")[0].innerText
          }
          m.mount(item, view.GetComponent(view))
        }
        // this.CreationTime = document.getElementById("StatusBar").innerHTML
        m.mount(container, parentComponent())
      } else if (container.children[0].className == "Upload") {
        m.mount(container, Main.Component)
      }
    }
  }
  return $
})()

window.addEventListener("DOMContentLoaded", () => {
  shupload.letsGo()
})
