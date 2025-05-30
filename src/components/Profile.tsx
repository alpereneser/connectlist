@@ .. @@
                  <img
-                    src={profile?.avatar}
+                    src={profile?.avatar ? `${profile.avatar}${profile.avatar.includes('?') ? '&' : '?'}t=1` : "https://api.dicebear.com/7.x/avataaars/svg"}
                     alt={profile?.full_name}
                     className="w-14 h-14 rounded-full object-cover"
                   />