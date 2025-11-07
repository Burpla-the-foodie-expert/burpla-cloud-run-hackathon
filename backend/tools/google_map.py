import googlemaps
import os
from dotenv import load_dotenv

load_dotenv(override=True)

def plot_named_locations_googlemap(users_location, places_location):
    """
    Plot user and place locations on a REAL Google Map (JS API), with:
      - Auto-zoom to fit all points
      - Proper emoji alignment in popups
      - Blue markers for users, red markers for places

    Args:
        users_location (list[dict]): [{'user_name': str, 'address': str}, ...]
        places_location (list[dict]): [{'place_name': str, 'address': str}, ...]
        api_key (str): Google Maps API key
        output_file (str): HTML file path

    Returns:
        str: HTML string of the rendered map
    """

    api_key=os.getenv("GOOGLE_API_KEY")
    gmaps = googlemaps.Client(key=api_key)

    def geocode_address(address):
        try:
            result = gmaps.geocode(address)
            if result:
                loc = result[0]["geometry"]["location"]
                return (loc["lat"], loc["lng"])
        except Exception as e:
            print(f"Error geocoding {address}: {e}")
        return None

    # Geocode users
    geocoded_users = []
    for u in users_location:
        coord = geocode_address(u.address)  # Use attribute-style access
        if coord:
            geocoded_users.append({
                "name": u.user_name,  # Use attribute-style access
                "address": u.address,
                "coord": coord
            })

    # Geocode places
    geocoded_places = []
    for p in places_location:
        coord = geocode_address(p.address)  # Use attribute-style access
        if coord:
            geocoded_places.append({
                "name": p.place_name,  # Use attribute-style access
                "address": p.address,
                "coord": coord
            })

    if not geocoded_users and not geocoded_places:
        raise ValueError("No valid coordinates found.")

    # Prepare JavaScript arrays
    js_users = ",".join(
        [f"{{lat:{u['coord'][0]}, lng:{u['coord'][1]}, title:'👤 {u['name']}', address:`{u['address']}`}}" for u in geocoded_users]
    )
    js_places = ",".join(
        [f"{{lat:{p['coord'][0]}, lng:{p['coord'][1]}, title:'📍 {p['name']}', address:`{p['address']}`}}" for p in geocoded_places]
    )

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Google Map Visualization</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width">
        <meta charset="utf-8">
        <style>
            #map {{
                height: 100vh;
                width: 100%;
            }}
            .info-window {{
                font-family: Arial, sans-serif;
                font-size: 14px;
                line-height: 1.2;
                margin: 0;
                padding: 0;
            }}
            .info-window b {{
                display: flex;
                align-items: center;
                gap: 4px;
                margin-bottom: 2px;
            }}
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            function initMap() {{
                const map = new google.maps.Map(document.getElementById('map'), {{
                    zoom: 13,
                    center: {{ lat: 0, lng: 0 }}
                }});

                const bounds = new google.maps.LatLngBounds();
                const infoWindow = new google.maps.InfoWindow();

                const users = [{js_users}];
                const places = [{js_places}];

                // Add user markers (blue)
                users.forEach(u => {{
                    const marker = new google.maps.Marker({{
                        position: {{lat: u.lat, lng: u.lng}},
                        map,
                        title: u.title,
                        icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                    }});
                    bounds.extend(marker.position);
                    marker.addListener("click", () => {{
                        infoWindow.setContent(`
                          <div class='info-window'>
                            <b>${{u.title}}</b><br>${{u.address}}
                          </div>`);
                        infoWindow.open(map, marker);
                    }});
                }});

                // Add place markers (red)
                places.forEach(p => {{
                    const marker = new google.maps.Marker({{
                        position: {{lat: p.lat, lng: p.lng}},
                        map,
                        title: p.title,
                        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                    }});
                    bounds.extend(marker.position);
                    marker.addListener("click", () => {{
                        infoWindow.setContent(`
                          <div class='info-window'>
                            <b>${{p.title}}</b><br>${{p.address}}
                          </div>`);
                        infoWindow.open(map, marker);
                    }});
                }});

                // Automatically fit map to show all points
                map.fitBounds(bounds);

                // Optional: prevent zooming in too far
                google.maps.event.addListenerOnce(map, 'bounds_changed', function() {{
                    if (this.getZoom() > 17) this.setZoom(17);
                }});
            }}
        </script>
        <script async defer src="https://maps.googleapis.com/maps/api/js?key={api_key}&callback=initMap"></script>
    </body>
    </html>
    """
    return html



# Example run
if __name__ == "__main__":
    users_location = [
        {"user_name": "Huy", "address": "12315 Churchill Downs Dr Houston, TX 77047"},
        {"user_name": "Huy Nguyen", "address": "11815 catrose ln, TX 77429"},
    ]

    places_location = [
        {"place_name": "EOG office", "address": "1111 Bagby St Lobby 2, Houston, TX 77002"},
        {"place_name": "China Town", "address": "11200 Bellaire Blvd, Houston, TX 77072"},
        {"place_name": "Chicha San Chen", "address": "9750 Bellaire Blvd, Houston, TX 77036"},
    ]

    html = plot_named_locations_googlemap(users_location, places_location)
        # Save HTML
    
    output_file="google_map.html"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅ Google Map created: {output_file}")