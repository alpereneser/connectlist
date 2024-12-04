# Be sure to restart your server when you modify this file.

Rails.application.configure do
  config.content_security_policy do |policy|
    policy.default_src :self, :https
    policy.font_src    :self, :https, :data
    policy.img_src     :self, :https, :data
    policy.object_src  :none
    policy.script_src  :self, :https, :unsafe_eval, :unsafe_inline
    policy.style_src   :self, :https, :unsafe_inline
    
    # Allow @vite/client to hot reload javascript changes in development
    if Rails.env.development?
      policy.script_src *policy.script_src, "http://#{ ViteRuby.config.host_with_port }"
      policy.style_src *policy.style_src, :unsafe_inline
      policy.connect_src :self, "http://#{ ViteRuby.config.host_with_port }"
    end
  end

  # Generate session nonces for permitted importmap and inline scripts
  config.content_security_policy_nonce_generator = ->(request) { request.session.id.to_s }
  config.content_security_policy_nonce_directives = %w(script-src style-src)
end
