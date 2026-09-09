from django.contrib import admin

from .models import Customer, Message, Tag, Ticket


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ["id", "subject", "customer", "status", "priority", "assignee"]
    list_filter = ["status", "priority", "tags"]
    search_fields = ["subject", "customer__name", "customer__email"]
    inlines = [MessageInline]


admin.site.register(Customer)
admin.site.register(Tag)
admin.site.site_header = "GlassDesk administration"
