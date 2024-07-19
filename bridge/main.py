import requests_toolbelt.sessions

session = requests_toolbelt.sessions.BaseUrlSession(base_url="http://localhost:10001")

post = session.post
delete = session.delete
get = session.get
put = session.put
patch = session.patch
head = session.head
options = session.options
