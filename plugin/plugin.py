from app.plugins import PluginBase, Menu, MountPoint
from django.shortcuts import render

class Plugin(PluginBase):

    def main_menu(self):
        return [Menu("GCP Editor Pro", self.public_url(""), "gcp-editor-pro-icon fa fa-fw")]
    
    def include_css_files(self):
        return ['style.css']

    def app_mount_points(self):
        return [
            MountPoint('$', lambda request: render(request, self.template_path("app.html"), {'title': 'GCP Editor Pro'}))
        ]


